import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { sendPausedByInactivityEmail } from "@/lib/email/send-paused-by-inactivity";
import { sendPauseReminder30Email } from "@/lib/email/send-pause-reminder-30";
import { sendPauseWarning50Email } from "@/lib/email/send-pause-warning-50";
import { sendSubscriptionCanceledEmail } from "@/lib/email/send-subscription-canceled";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INACTIVITY_DAYS_TO_PAUSE = 30;
const GRACE_DAYS_AFTER_SIGNUP = 14;
const REMINDER_30_DAY = 30;
const WARNING_50_DAY = 50;
const CANCEL_DAY = 60;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

type ActiveSub = {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  status: string;
  started_at: string | null;
  created_at: string;
};

type PausedSub = {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  paused_at: string;
  pause_notified_30_at: string | null;
  pause_notified_50_at: string | null;
};

/**
 * Implementa la política "pagás solo si avanzás" en 4 etapas:
 *   A) Active >14d sin actividad >=30d → pause_collection ON + email.
 *   B) Paused >=30d sin notificar → recordatorio.
 *   C) Paused >=50d sin notificar → aviso final.
 *   D) Paused >=60d → cancel subscription en Stripe + email cierre.
 *
 * Idempotente: cada etapa usa una columna de timestamp como flag para
 * que no se reenvíe el email si el cron corre 2 veces en el mismo día.
 *
 * Daily a 14:00 UTC (vercel.json) ≈ 6 am en San Diego.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const stripe = getStripe();
  const now = new Date();
  const stats = { paused: 0, cashExpired: 0, reminded30: 0, warned50: 0, canceled: 0, errors: 0 };

  // -----------------------------------------------------------------
  // 0) PAUSE cash subs vencidos + 5 días de gracia (Checkout Pro AR)
  //    Política: voucher mensual; si no pagan, gracia 5 días, después pausa.
  // -----------------------------------------------------------------
  const cashGraceCutoff = new Date(now.getTime() - 5 * 86_400_000).toISOString();
  const { data: cashExpired } = await admin
    .from("subscriptions")
    .select("id, user_id")
    .eq("payment_method", "checkout_pro")
    .eq("status", "active")
    .is("paused_at", null)
    .lt("current_period_end", cashGraceCutoff)
    .returns<{ id: string; user_id: string }[]>();

  for (const sub of cashExpired ?? []) {
    try {
      const nowIso = now.toISOString();
      const { error: updErr } = await admin
        .from("subscriptions")
        .update({
          status: "paused",
          paused_at: nowIso,
          pause_reason: "payment_failed",
        })
        .eq("id", sub.id);
      if (updErr) throw new Error(`update paused: ${updErr.message}`);
      stats.cashExpired++;
    } catch (err) {
      stats.errors++;
      console.error(
        `[pause-cron] CASH-EXPIRE failed sub=${sub.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // -----------------------------------------------------------------
  // A) PAUSE active subs inactivos
  // -----------------------------------------------------------------
  const graceCutoff = new Date(
    now.getTime() - GRACE_DAYS_AFTER_SIGNUP * 86_400_000,
  ).toISOString();
  const inactivityCutoff = new Date(
    now.getTime() - INACTIVITY_DAYS_TO_PAUSE * 86_400_000,
  ).toISOString();

  const { data: actives } = await admin
    .from("subscriptions")
    .select("id, user_id, stripe_subscription_id, status, started_at, created_at")
    .eq("status", "active")
    .is("paused_at", null)
    .lt("created_at", graceCutoff)
    .returns<ActiveSub[]>();

  for (const sub of actives ?? []) {
    try {
      // ¿Hay actividad reciente? (assignment_submissions.submitted_at o
      // section_progress.updated_at desde inactivityCutoff)
      const [{ count: subCount }, { count: progCount }] = await Promise.all([
        admin
          .from("assignment_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", sub.user_id)
          .gte("submitted_at", inactivityCutoff),
        admin
          .from("section_progress")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", sub.user_id)
          .gte("updated_at", inactivityCutoff),
      ]);
      if ((subCount ?? 0) > 0 || (progCount ?? 0) > 0) continue;

      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: { behavior: "void" },
      });

      const nowIso = now.toISOString();
      const { error: updErr } = await admin
        .from("subscriptions")
        .update({
          paused_at: nowIso,
          pause_reason: "inactivity",
        })
        .eq("id", sub.id);
      if (updErr) throw new Error(`update paused_at: ${updErr.message}`);

      const emailRes = await sendPausedByInactivityEmail(
        sub.user_id,
        INACTIVITY_DAYS_TO_PAUSE,
      );
      if (!emailRes.ok) console.error(`[pause-cron] paused-email failed user=${sub.user_id}: ${emailRes.error}`);
      stats.paused++;
    } catch (err) {
      stats.errors++;
      console.error(
        `[pause-cron] PAUSE failed sub=${sub.stripe_subscription_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // -----------------------------------------------------------------
  // B/C/D) Manejar paused subs por tiempo en pausa
  // -----------------------------------------------------------------
  const { data: paused } = await admin
    .from("subscriptions")
    .select(
      "id, user_id, stripe_subscription_id, paused_at, pause_notified_30_at, pause_notified_50_at",
    )
    .not("paused_at", "is", null)
    .is("canceled_by_inactivity_at", null)
    .returns<PausedSub[]>();

  for (const sub of paused ?? []) {
    const days = daysBetween(now, new Date(sub.paused_at));
    try {
      if (days >= CANCEL_DAY) {
        // D) Cancelar sub en Stripe.
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        const nowIso = now.toISOString();
        await admin
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: nowIso,
            canceled_by_inactivity_at: nowIso,
          })
          .eq("id", sub.id);

        const emailRes = await sendSubscriptionCanceledEmail(sub.user_id);
        if (!emailRes.ok) console.error(`[pause-cron] canceled-email failed user=${sub.user_id}: ${emailRes.error}`);
        stats.canceled++;
      } else if (days >= WARNING_50_DAY && !sub.pause_notified_50_at) {
        // C) Aviso 50d.
        const emailRes = await sendPauseWarning50Email(sub.user_id, days);
        if (emailRes.ok) {
          await admin
            .from("subscriptions")
            .update({ pause_notified_50_at: now.toISOString() })
            .eq("id", sub.id);
          stats.warned50++;
        } else {
          console.error(`[pause-cron] warn50-email failed user=${sub.user_id}: ${emailRes.error}`);
        }
      } else if (days >= REMINDER_30_DAY && !sub.pause_notified_30_at) {
        // B) Recordatorio 30d.
        const emailRes = await sendPauseReminder30Email(sub.user_id, days);
        if (emailRes.ok) {
          await admin
            .from("subscriptions")
            .update({ pause_notified_30_at: now.toISOString() })
            .eq("id", sub.id);
          stats.reminded30++;
        } else {
          console.error(`[pause-cron] rem30-email failed user=${sub.user_id}: ${emailRes.error}`);
        }
      }
    } catch (err) {
      stats.errors++;
      console.error(
        `[pause-cron] paused-stage failed sub=${sub.stripe_subscription_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(
    `[pause-cron] paused=${stats.paused} reminded30=${stats.reminded30} warned50=${stats.warned50} canceled=${stats.canceled} errors=${stats.errors}`,
  );

  return NextResponse.json({ ok: true, stats });
}
