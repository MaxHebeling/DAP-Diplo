import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { constructStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

// Maneja los 5 eventos configurados en Stripe Dashboard:
//   customer.subscription.{created,updated,deleted}
//   invoice.{paid,payment_failed}
//
// Idempotencia: rastreo explícito vía tabla stripe_events_processed.
// Antes de procesar un evento, chequeamos si su id ya está en la tabla;
// si sí, no-op y devolvemos 200. Después de procesar exitosamente,
// INSERT del id. Si Stripe reenvía el mismo evento (timeout, reintento),
// el segundo proceso es no-op.

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
      case "customer.subscription.created":
      case "customer.subscription.updated":
        result = await upsertSubscription(event.data.object as Stripe.Subscription);
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
        result = await markSubscriptionPastDue(event.data.object as Stripe.Invoice);
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

  // Mark processed (no fallar si ya existe por race condition).
  const { error: insErr } = await admin
    .from("stripe_events_processed")
    .insert({ id: event.id, event_type: event.type });
  if (insErr && !/duplicate|already exists/i.test(insErr.message)) {
    // Otro error de DB: log pero responde 200 (ya procesamos).
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

async function upsertSubscription(
  sub: Stripe.Subscription,
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

  // Mantenemos months_paid_total si ya existe la fila (lo incrementa invoice.paid).
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
    detail: "block_access preservado",
  };
}

async function markSubscriptionPastDue(
  invoice: Stripe.Invoice,
): Promise<EventResult> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return { ok: true, detail: "invoice sin subscription" };
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);
  return { ok: true, detail: `sub=${subId} → past_due` };
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<EventResult> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return { ok: true, detail: "invoice sin subscription, ignorado" };

  // Solo contamos invoices que corresponden a un nuevo período de cobro.
  // Otros billing_reason (manual, subscription_update, etc.) no incrementan
  // months_paid_total ni disparan el drip.
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
    .select("user_id, months_paid_total")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (selErr) throw new Error(`Lookup subscription falló: ${selErr.message}`);
  if (!subRow) {
    // El evento subscription.created todavía no se ha procesado:
    // Stripe reintentará este invoice.paid. 500 → retry. Idempotency
    // table no se marca, así que el retry sí re-procesará.
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

  // TODO (Prompt 3.3): reemplazar este bloque por
  //   await admin.rpc("unlock_next_block_if_needed", { p_user_id: subRow.user_id });
  // Mismo efecto: drip cada 2 meses paga → 1 bloque nuevo.
  // Mes 1 → bloque 1; mes 3 → bloque 2; …; mes 17 → bloque 9.
  const unlockedCount = Math.min(9, Math.ceil(newCount / 2));
  const { data: blocks, error: blocksErr } = await admin
    .from("blocks")
    .select("id, order_index")
    .lte("order_index", unlockedCount)
    .order("order_index", { ascending: true });
  if (blocksErr) throw new Error(`Read blocks falló: ${blocksErr.message}`);
  if (blocks && blocks.length > 0) {
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

  return {
    ok: true,
    userId: subRow.user_id,
    detail: `reason=${reason} months=${newCount} unlocked=${unlockedCount}/9`,
  };
}
