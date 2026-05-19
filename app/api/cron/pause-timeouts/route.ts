import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelSubscription } from "@/lib/stripe/api";
import { sendPauseReminder30Email } from "@/lib/email/send-pause-reminder-30";
import { sendPauseWarning50Email } from "@/lib/email/send-pause-warning-50";
import { sendSubscriptionCanceledEmail } from "@/lib/email/send-subscription-canceled";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cron diario (0 9 * * *). Lee subscriptions_pause_status, procesa cada
// sub según next_action: 30d → email amable, 50d → email final, 60d →
// stripe cancel + email final.
//
// Idempotencia: cada nivel se manda 1 vez por ciclo de pausa.
// last_reminder_level + last_reminder_sent_at comparados contra paused_at:
// si last_reminder_sent_at < paused_at, es de una pausa previa → ignora.

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.VERCEL_ENV !== "production";
  }
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

type PauseStatusRow = {
  id: string; // subscription id
  user_id: string;
  stripe_subscription_id: string | null;
  paused_at: string;
  extension_count: number;
  full_name: string | null;
  days_in_pause: number;
  next_action:
    | "wait"
    | "email_friendly_reminder"
    | "email_final_warning"
    | "cancel_now";
};

type SubExtraRow = {
  id: string;
  current_month_number: number;
  status: string;
  last_reminder_sent_at: string | null;
  last_reminder_level: "reminder_30d" | "warning_50d" | null;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1) Carga las subs pendientes de acción
  const { data: pending, error: viewErr } = await admin
    .from("subscriptions_pause_status")
    .select("*")
    .neq("next_action", "wait")
    .returns<PauseStatusRow[]>();
  if (viewErr) {
    console.error("[cron.pause-timeouts] view query failed:", viewErr.message);
    return NextResponse.json({ error: viewErr.message }, { status: 500 });
  }
  const rows = pending ?? [];
  if (rows.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      by_action: { reminder: 0, warning: 0, cancel: 0 },
    });
  }

  // 2) Carga campos extra de cada sub (current_month, status, last_reminder_*)
  const subIds = rows.map((r) => r.id);
  const { data: extras } = await admin
    .from("subscriptions")
    .select("id, current_month_number, status, last_reminder_sent_at, last_reminder_level")
    .in("id", subIds);
  const extraById = new Map<string, SubExtraRow>(
    ((extras ?? []) as SubExtraRow[]).map((e) => [e.id, e]),
  );

  let sentReminder = 0;
  let sentWarning = 0;
  let canceled = 0;

  for (const row of rows) {
    const extra = extraById.get(row.id);
    if (!extra) {
      console.warn(`[cron.pause-timeouts] sub ${row.id} sin extra row, skip`);
      continue;
    }

    // Reminder stale-check: si last_reminder_sent_at es anterior al paused_at,
    // viene de un ciclo de pausa previo (resumed luego repause). Tratamos
    // como si no hubiera reminder previo.
    const lastSentMs = extra.last_reminder_sent_at
      ? new Date(extra.last_reminder_sent_at).getTime()
      : 0;
    const pausedMs = new Date(row.paused_at).getTime();
    const lastLevel: SubExtraRow["last_reminder_level"] =
      lastSentMs >= pausedMs ? extra.last_reminder_level : null;

    try {
      switch (row.next_action) {
        case "email_friendly_reminder": {
          if (lastLevel === "reminder_30d" || lastLevel === "warning_50d") {
            console.log(
              `[cron.pause-timeouts] sub=${row.id} 30d ya enviado (lastLevel=${lastLevel}), skip`,
            );
            continue;
          }
          const emailRes = await sendPauseReminder30Email(
            row.user_id,
            row.days_in_pause,
            extra.current_month_number,
          );
          if (!emailRes.ok) {
            console.error(
              `[cron.pause-timeouts] sub=${row.id} reminder30 email failed: ${emailRes.error}`,
            );
            break;
          }
          await admin
            .from("subscriptions")
            .update({
              last_reminder_sent_at: new Date().toISOString(),
              last_reminder_level: "reminder_30d",
            })
            .eq("id", row.id);
          console.log(
            `[cron.pause-timeouts] sub=${row.id} reminder30 sent (days=${row.days_in_pause})`,
          );
          sentReminder++;
          break;
        }

        case "email_final_warning": {
          if (lastLevel === "warning_50d") {
            console.log(
              `[cron.pause-timeouts] sub=${row.id} warning50 ya enviado, skip`,
            );
            continue;
          }
          const emailRes = await sendPauseWarning50Email(
            row.user_id,
            row.days_in_pause,
            extra.current_month_number,
          );
          if (!emailRes.ok) {
            console.error(
              `[cron.pause-timeouts] sub=${row.id} warning50 email failed: ${emailRes.error}`,
            );
            break;
          }
          await admin
            .from("subscriptions")
            .update({
              last_reminder_sent_at: new Date().toISOString(),
              last_reminder_level: "warning_50d",
            })
            .eq("id", row.id);
          console.log(
            `[cron.pause-timeouts] sub=${row.id} warning50 sent (days=${row.days_in_pause})`,
          );
          sentWarning++;
          break;
        }

        case "cancel_now": {
          if (extra.status === "canceled") {
            console.log(
              `[cron.pause-timeouts] sub=${row.id} ya canceled, skip`,
            );
            continue;
          }
          // (a) Stripe cancel
          if (row.stripe_subscription_id) {
            try {
              await cancelSubscription(row.stripe_subscription_id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              console.error(
                `[cron.pause-timeouts] sub=${row.id} stripe cancel failed: ${msg}`,
              );
              // Continúa: marcamos local como canceled. Webhook
              // subscription.deleted lo resincroniza si Stripe lo cancela después.
            }
          }
          // (b) DB cancel
          await admin
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
              paused_at: null,
              pause_reason: null,
              last_reminder_sent_at: null,
              last_reminder_level: null,
            })
            .eq("id", row.id);
          // (c) Email final
          const emailRes = await sendSubscriptionCanceledEmail(row.user_id);
          if (!emailRes.ok) {
            console.error(
              `[cron.pause-timeouts] sub=${row.id} canceled email failed: ${emailRes.error}`,
            );
          }
          console.log(
            `[cron.pause-timeouts] sub=${row.id} CANCELED (days=${row.days_in_pause})`,
          );
          canceled++;
          break;
        }

        default:
          // shouldn't happen, view filters wait
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[cron.pause-timeouts] sub=${row.id} action=${row.next_action} FAILED: ${msg}`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    processed: rows.length,
    by_action: {
      reminder: sentReminder,
      warning: sentWarning,
      cancel: canceled,
    },
  });
}
