import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

/**
 * Verifica la firma del webhook de Stripe usando STRIPE_WEBHOOK_SECRET.
 * rawBody DEBE ser el body crudo: `await request.text()`.
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
