import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

/**
 * Verifica la firma del webhook de Stripe usando STRIPE_WEBHOOK_SECRET
 * y devuelve el evento parseado. Tira si la firma no valida.
 *
 * IMPORTANTE: rawBody debe ser el body crudo del request (text), no
 * el parseado. En Next App Router: `await request.text()`.
 */
export function constructStripeEvent(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET no está configurado");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
