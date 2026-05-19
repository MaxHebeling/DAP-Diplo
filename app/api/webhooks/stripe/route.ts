import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { sendPaymentFailedEmail } from "@/lib/email/send-payment-failed";
import { constructStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

// Modelo v3.3: suscripción simple. SIN gating académico, SIN pausa automática.
//
// 5 eventos manejados:
//   customer.subscription.created  → crea fila + welcome email
//   customer.subscription.updated  → sincroniza estado de Stripe
//   customer.subscription.deleted  → status=canceled
//   invoice.paid                   → status=active (no-op si ya está)
//   invoice.payment_failed         → status=past_due + email
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
  _opts: { isCreate: boolean },
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
  };

  const { error } = await admin
    .from("subscriptions")
    .upsert(payload, {
      onConflict: "stripe_subscription_id",
      ignoreDuplicates: false,
    });
  if (error) throw new Error(`Upsert subscriptions falló: ${error.message}`);

  return { ok: true, userId, detail: `status=${sub.status}` };
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

  // Solo procesamos invoices de creación o renovación del ciclo.
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
    .select("user_id, status")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (selErr) throw new Error(`Lookup subscription falló: ${selErr.message}`);
  if (!subRow) {
    // subscription.created todavía no se procesó: 500 → Stripe retry.
    throw new Error(
      `Subscription ${subId} no existe aún — invoice.paid llegó antes de subscription.created`,
    );
  }

  // Si venía past_due → la marcamos active.
  if (subRow.status !== "active") {
    const { error: updErr } = await admin
      .from("subscriptions")
      .update({ status: "active" })
      .eq("stripe_subscription_id", subId);
    if (updErr) throw new Error(`Update status falló: ${updErr.message}`);
  }

  return {
    ok: true,
    userId: subRow.user_id,
    detail: `reason=${reason}${subRow.status !== "active" ? " → active" : ""}`,
  };
}
