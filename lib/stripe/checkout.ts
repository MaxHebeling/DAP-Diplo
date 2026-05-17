import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

export type CheckoutModule = {
  id: string;
  slug: string;
  stripe_price_id: string;
};

export type CheckoutUser = {
  id: string;
  email: string;
};

/**
 * Crea una Stripe Checkout Session para la compra de un módulo.
 *
 * metadata: { userId, moduleId } — leído por el webhook al confirmar el
 * pago para insertar la fila en `enrollments`.
 *
 * client_reference_id duplicado para inspección rápida en el dashboard.
 */
export async function createCheckoutSession(
  user: CheckoutUser,
  m: CheckoutModule,
  appUrl: string,
): Promise<Stripe.Checkout.Session> {
  return await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [{ price: m.stripe_price_id, quantity: 1 }],
    metadata: { userId: user.id, moduleId: m.id, slug: m.slug },
    success_url: `${appUrl}/modulos/${m.slug}/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/modulos/${m.slug}`,
    locale: "es",
    // Prefill billing addr cuando esté disponible; no requerido para MVP.
    billing_address_collection: "auto",
  });
}
