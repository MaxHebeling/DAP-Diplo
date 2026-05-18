import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { sendMonthAdvancedEmail } from "@/lib/email/send-month-advanced";
import { sendSubscriptionPausedEmail } from "@/lib/email/send-subscription-paused";
import { sendPaymentFailedEmail } from "@/lib/email/send-payment-failed";
import { constructStripeEvent } from "@/lib/stripe/webhook";
import { pauseSubscriptionCollection } from "@/lib/stripe/api";

export const runtime = "nodejs";

// Modelo mensual con gating académico (CLAUDE.md v3, migrations 0008/0009).
//
// 6 eventos manejados:
//   customer.subscription.created  → crea fila + welcome email
//   customer.subscription.updated  → sincroniza + detecta pause_collection
//   customer.subscription.deleted  → status=canceled + limpia paused_at
//   invoice.paid                   → +1 months_paid_total + try_advance_month
//   invoice.payment_failed         → status=past_due + email
//   invoice.upcoming               → si should_pause: pausa Stripe + email
//
// Idempotencia: tabla stripe_events_processed (check antes + insert después).

type EventResult = {
  ok: true;
  userId?: string | null;
  detail?: string;
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Falta stripe-signature" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Firma inválida";
    console.error("[stripe.webhook] signature failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency check
  const { data: already } = await admin
    .from("stripe_events_processed")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (already) {
    console.log(
      `[stripe.webhook] event=${event.id} type=${event.type} → SKIP (already processed)`,
    );
    return NextResponse.json({ received: true, idempotent: true });
  }

  let result: EventResult;
  try {
    switch (event.type) {
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        result = await upsertSubscription(sub, { isCreate: true });
        if (result.userId) {
          const emailRes = await sendWelcomeEmail(result.userId);
          logEmail("welcome", result.userId, emailRes);
        }
        break;
      }
      case "customer.subscription.updated":
        result = await upsertSubscription(
          event.data.object as Stripe.Subscription,
          { isCreate: false },
        );
        break;
      case "customer.subscription.deleted":
        result = await markSubscriptionCanceled(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.paid":
        result = await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        result = await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      case "invoice.upcoming":
        result = await handleInvoiceUpcoming(
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        result = { ok: true, detail: "no-handler" };
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error procesando webhook";
    console.error(
      `[stripe.webhook] event=${event.id} type=${event.type} → FAILED: ${msg}`,
    );
    // 500 → Stripe reintenta automáticamente.
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  console.log(
    `[stripe.webhook] event=${event.id} type=${event.type} userId=${result.userId ?? "—"} → OK${result.detail ? ` (${result.detail})` : ""}`,
  );

  // Mark processed (no fallar si ya existe por race condition)
  const { error: insErr } = await admin
    .from("stripe_events_processed")
    .insert({ id: event.id, event_type: event.type });
  if (insErr && !/duplicate|already exists/i.test(insErr.message)) {
    console.error(
      `[stripe.webhook] event=${event.id} no se pudo marcar como procesado: ${insErr.message}`,
    );
  }

  return NextResponse.json({ received: true });
}

// --- helpers ---------------------------------------------------------

function tsToIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

// En Stripe 22 los periodos viven en items.data[0], no en la Subscription.
function subscriptionPeriod(sub: Stripe.Subscription): {
  start: number | null;
  end: number | null;
} {
  const item = sub.items?.data?.[0];
  if (!item) return { start: null, end: null };
  return {
    start: item.current_period_start ?? null,
    end: item.current_period_end ?? null,
  };
}

// invoice.subscription top-level fue removido en Stripe 22.
// Ahora vive en invoice.parent.subscription_details.subscription.
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return null;
  return typeof ref === "string" ? ref : (ref.id ?? null);
}

function logEmail(
  kind: string,
  userId: string,
  res: { ok: boolean; id?: string; error?: string },
): void {
  if (res.ok) {
    console.log(
      `[stripe.webhook] email=${kind} userId=${userId} sent resend_id=${res.id}`,
    );
  } else {
    console.error(
      `[stripe.webhook] email=${kind} userId=${userId} FAILED: ${res.error}`,
    );
  }
}

async function upsertSubscription(
  sub: Stripe.Subscription,
  opts: { isCreate: boolean },
): Promise<EventResult> {
  const userId = sub.metadata?.userId;
  if (!userId) {
    throw new Error(
      `customer.subscription.${sub.status} sin metadata.userId — sub=${sub.id}`,
    );
  }

  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) {
    throw new Error(`Subscription ${sub.id} sin price_id`);
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    throw new Error(`Subscription ${sub.id} sin customer`);
  }

  const admin = createAdminClient();

  // Mantenemos contadores y current_month_number si la fila ya existe.
  // En subscription.updated NUNCA reiniciamos esos campos.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("months_paid_total, current_month_number, paused_at, pause_reason")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  // Detectar pause_collection cambios desde Stripe (Customer Portal o API
  // manual). Si Stripe trae pause_collection != null y nosotros no tenemos
  // paused_at: marca como pausa "manual". Si Stripe trae null y nosotros
  // tenemos paused_at: limpia (la pausa se resolvió externamente).
  const stripeHasPause = sub.pause_collection != null;
  const dbHasPause = existing?.paused_at != null;

  let pausedAtNew: string | null | undefined;
  let pauseReasonNew: string | null | undefined;
  if (stripeHasPause && !dbHasPause) {
    pausedAtNew = new Date().toISOString();
    pauseReasonNew = "manual";
  } else if (!stripeHasPause && dbHasPause) {
    pausedAtNew = null;
    pauseReasonNew = null;
  } else {
    pausedAtNew = undefined; // sin cambio
    pauseReasonNew = undefined;
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: tsToIso(subscriptionPeriod(sub).start),
    current_period_end: tsToIso(subscriptionPeriod(sub).end),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    cancel_at: tsToIso(sub.cancel_at),
    canceled_at: tsToIso(sub.canceled_at),
    months_paid_total: existing?.months_paid_total ?? 0,
    // En create: arranca en mes 1. En update: preserva lo que haya en DB.
    current_month_number:
      existing?.current_month_number ?? (opts.isCreate ? 1 : 1),
    month_started_at: opts.isCreate ? new Date().toISOString() : undefined,
  };
  if (pausedAtNew !== undefined) payload.paused_at = pausedAtNew;
  if (pauseReasonNew !== undefined) payload.pause_reason = pauseReasonNew;

  // Limpia keys undefined (Supabase los manda como NULL si los dejamos)
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }

  const { error } = await admin
    .from("subscriptions")
    .upsert(payload, {
      onConflict: "stripe_subscription_id",
      ignoreDuplicates: false,
    });
  if (error) throw new Error(`Upsert subscriptions falló: ${error.message}`);

  let detail = `status=${sub.status}`;
  if (pausedAtNew === null) detail += " | pause cleared (Stripe → DB)";
  if (pausedAtNew && pausedAtNew !== undefined)
    detail += " | pause set (Stripe → DB, manual)";

  return { ok: true, userId, detail };
}

async function markSubscriptionCanceled(
  sub: Stripe.Subscription,
): Promise<EventResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: tsToIso(sub.canceled_at) ?? new Date().toISOString(),
      paused_at: null,
      pause_reason: null,
    })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw new Error(`Cancel subscription falló: ${error.message}`);
  return {
    ok: true,
    userId: sub.metadata?.userId ?? null,
    detail: "canceled (progreso del alumno preservado)",
  };
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<EventResult> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return { ok: true, detail: "invoice sin subscription" };
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (!sub) {
    return { ok: true, detail: `sub=${subId} no existe en DB todavía` };
  }
  await admin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);

  const emailRes = await sendPaymentFailedEmail(sub.user_id);
  logEmail("payment-failed", sub.user_id, emailRes);

  return {
    ok: true,
    userId: sub.user_id,
    detail: `sub=${subId} → past_due`,
  };
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<EventResult> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return { ok: true, detail: "invoice sin subscription, ignorado" };

  // Solo contamos invoices de nuevo período de cobro.
  const reason = invoice.billing_reason;
  if (reason !== "subscription_create" && reason !== "subscription_cycle") {
    return {
      ok: true,
      detail: `billing_reason=${reason} ignorado (solo cuentan create/cycle)`,
    };
  }

  const admin = createAdminClient();
  const { data: subRow, error: selErr } = await admin
    .from("subscriptions")
    .select("user_id, months_paid_total, current_month_number")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (selErr) throw new Error(`Lookup subscription falló: ${selErr.message}`);
  if (!subRow) {
    // subscription.created todavía no se procesó: 500 → Stripe retry.
    throw new Error(
      `Subscription ${subId} no existe aún — invoice.paid llegó antes de subscription.created`,
    );
  }

  const newCount = (subRow.months_paid_total ?? 0) + 1;
  const monthBefore = subRow.current_month_number;

  const { error: updErr } = await admin
    .from("subscriptions")
    .update({ months_paid_total: newCount })
    .eq("stripe_subscription_id", subId);
  if (updErr) throw new Error(`Update months falló: ${updErr.message}`);

  // try_advance_month: avanza si pagó + completó el mes actual.
  // Si todavía no completó el mes actual, queda en monthBefore (Stripe
  // ya cobró pero el alumno no avanza hasta aprobar — gating académico).
  const { data: newMonth, error: rpcErr } = await admin.rpc(
    "try_advance_month",
    { p_user_id: subRow.user_id },
  );
  if (rpcErr) {
    throw new Error(`try_advance_month falló: ${rpcErr.message}`);
  }
  const monthAfter = typeof newMonth === "number" ? newMonth : monthBefore;
  const advanced = monthAfter > monthBefore;

  // Email "Bienvenido al Mes N" si avanzó
  if (advanced) {
    const emailRes = await sendMonthAdvancedEmail(subRow.user_id, monthAfter);
    logEmail("month-advanced", subRow.user_id, emailRes);
  }

  return {
    ok: true,
    userId: subRow.user_id,
    detail: `reason=${reason} months_paid=${newCount} month=${monthBefore}→${monthAfter}${advanced ? " (advanced)" : ""}`,
  };
}

async function handleInvoiceUpcoming(
  invoice: Stripe.Invoice,
): Promise<EventResult> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return { ok: true, detail: "invoice sin subscription" };

  const admin = createAdminClient();
  const { data: subRow } = await admin
    .from("subscriptions")
    .select("user_id, current_month_number, paused_at")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (!subRow) {
    return { ok: true, detail: `sub=${subId} no existe en DB todavía` };
  }

  // Si ya está pausada, no hacemos nada (evita Stripe double-pause y email dup)
  if (subRow.paused_at) {
    return {
      ok: true,
      userId: subRow.user_id,
      detail: "ya estaba pausada, no-op",
    };
  }

  // ¿Debe pausarse? (RPC: mes actual incompleto?)
  const { data: shouldPause, error: rpcErr } = await admin.rpc(
    "should_pause_for_incomplete_month",
    { p_user_id: subRow.user_id },
  );
  if (rpcErr) {
    throw new Error(`should_pause_for_incomplete_month falló: ${rpcErr.message}`);
  }
  if (shouldPause !== true) {
    return {
      ok: true,
      userId: subRow.user_id,
      detail: "mes completado, no pausa, cobro normal",
    };
  }

  // (a) Pausa en Stripe (fail-loud: si Stripe falla, NO marcamos paused_at
  //     local para que el siguiente tick lo reintente).
  await pauseSubscriptionCollection(subId, "mark_uncollectible");

  // (b) Marca en nuestra DB
  const { error: markErr } = await admin.rpc("mark_subscription_paused", {
    p_user_id: subRow.user_id,
    p_reason: "incomplete_month",
  });
  if (markErr) {
    throw new Error(`mark_subscription_paused falló: ${markErr.message}`);
  }

  // (c) Email con counts del mes actual
  const [{ data: approved }, { count: totalCount }] = await Promise.all([
    admin.rpc("count_approved_modules_in_month", {
      p_user_id: subRow.user_id,
      p_month: subRow.current_month_number,
    }),
    admin
      .from("modules")
      .select("id", { count: "exact", head: true })
      .eq("course_month", subRow.current_month_number),
  ]);
  const approvedCount = typeof approved === "number" ? approved : 0;
  const total = totalCount ?? 0;

  const emailRes = await sendSubscriptionPausedEmail(
    subRow.user_id,
    subRow.current_month_number,
    approvedCount,
    total,
  );
  logEmail("subscription-paused", subRow.user_id, emailRes);

  return {
    ok: true,
    userId: subRow.user_id,
    detail: `paused mes=${subRow.current_month_number} ${approvedCount}/${total}`,
  };
}
