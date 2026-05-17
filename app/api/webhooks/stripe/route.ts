import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { constructStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

// Maneja los 5 eventos configurados en Stripe Dashboard:
//   customer.subscription.{created,updated,deleted}
//   invoice.{paid,payment_failed}
//
// Idempotente: usa upsert con onConflict para soportar reintentos
// de Stripe sin duplicar filas ni romper el drip.

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

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await markSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await markSubscriptionPastDue(event.data.object as Stripe.Invoice);
        break;
      default:
        // No-op para eventos no esperados.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error procesando webhook";
    console.error("[stripe.webhook] handler error:", msg);
    // 500 → Stripe reintenta automáticamente.
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// --- helpers ---------------------------------------------------------

function tsToIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

// En Stripe 22 los periodos viven en items.data[0], no en la Subscription
// directamente (cambio para soportar items con periodos distintos).
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

// Invoice.subscription top-level fue removido en Stripe 22.
// Ahora vive en invoice.parent.subscription_details.subscription.
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return null;
  return typeof ref === "string" ? ref : (ref.id ?? null);
}

async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
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

  // Mantenemos months_paid_total si ya existe la fila (lo incrementa
  // invoice.paid). Solo lo seteamos a 0 si es INSERT nuevo.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("months_paid_total")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      status: sub.status,
      current_period_start: tsToIso(subscriptionPeriod(sub).start),
      current_period_end: tsToIso(subscriptionPeriod(sub).end),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      canceled_at: tsToIso(sub.canceled_at),
      months_paid_total: existing?.months_paid_total ?? 0,
    },
    { onConflict: "stripe_subscription_id", ignoreDuplicates: false },
  );
  if (error) throw new Error(`Upsert subscriptions falló: ${error.message}`);
}

async function markSubscriptionCanceled(
  sub: Stripe.Subscription,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: tsToIso(sub.canceled_at) ?? new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw new Error(`Cancel subscription falló: ${error.message}`);
}

async function markSubscriptionPastDue(invoice: Stripe.Invoice): Promise<void> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return;
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return; // invoice no asociada a subscription

  const admin = createAdminClient();
  const { data: subRow, error: selErr } = await admin
    .from("subscriptions")
    .select("user_id, months_paid_total")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (selErr) throw new Error(`Lookup subscription falló: ${selErr.message}`);
  if (!subRow) {
    // El evento de subscription.created todavía no ha sido procesado:
    // Stripe reintentará este invoice.paid. 500 → retry.
    throw new Error(
      `Subscription ${subId} no existe aún — invoice.paid llegó antes de subscription.created`,
    );
  }

  const newCount = (subRow.months_paid_total ?? 0) + 1;

  const { error: updErr } = await admin
    .from("subscriptions")
    .update({ months_paid_total: newCount })
    .eq("stripe_subscription_id", subId);
  if (updErr) throw new Error(`Update months falló: ${updErr.message}`);

  // Drip: cada 2 meses paga, se desbloquea 1 bloque más.
  // Mes 1 → bloque 1; mes 3 → bloque 2; mes 5 → bloque 3; …; mes 17 → bloque 9.
  const unlockedCount = Math.min(9, Math.ceil(newCount / 2));

  const { data: blocks, error: blocksErr } = await admin
    .from("blocks")
    .select("id, order_index")
    .lte("order_index", unlockedCount)
    .order("order_index", { ascending: true });
  if (blocksErr) throw new Error(`Read blocks falló: ${blocksErr.message}`);
  if (!blocks || blocks.length === 0) return;

  const rows = blocks.map((b) => ({
    user_id: subRow.user_id,
    block_id: b.id,
    source: "subscription" as const,
  }));
  const { error: accessErr } = await admin
    .from("block_access")
    .upsert(rows, {
      onConflict: "user_id,block_id",
      ignoreDuplicates: true,
    });
  if (accessErr) {
    throw new Error(`Upsert block_access falló: ${accessErr.message}`);
  }
}
