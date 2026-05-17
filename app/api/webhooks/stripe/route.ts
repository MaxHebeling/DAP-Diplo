import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { constructStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";
// Webhooks de Stripe requieren el body crudo (no parseado) para verificar firma.
// Next App Router lo permite cuando leemos con request.text().

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta stripe-signature" }, { status: 400 });
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
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
    // Otros eventos (refund, payment_failed, etc.) se ignoran en MVP.
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error procesando webhook";
    console.error("[stripe.webhook] handler error:", msg);
    // Devolvemos 500 para que Stripe reintente.
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const moduleId = session.metadata?.moduleId;

  if (!userId || !moduleId) {
    throw new Error(
      `checkout.session.completed sin metadata { userId, moduleId } — session=${session.id}`,
    );
  }

  // amount_total viene en la menor unidad (centavos USD por defecto).
  const amountCents = session.amount_total ?? 0;
  const currency = (session.currency ?? "usd").toLowerCase();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const admin = createAdminClient();

  // Idempotencia: unique (user_id, module_id) ya existe en el schema.
  // Usamos upsert con onConflict para no fallar en reintentos del webhook.
  const { error } = await admin
    .from("enrollments")
    .upsert(
      {
        user_id: userId,
        module_id: moduleId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        amount_paid_cents: amountCents,
        currency,
        status: "active",
      },
      { onConflict: "user_id,module_id", ignoreDuplicates: false },
    );

  if (error) {
    throw new Error(`Insert enrollment falló: ${error.message}`);
  }
}
