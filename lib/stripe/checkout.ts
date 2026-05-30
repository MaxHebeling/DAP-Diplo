import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";

/**
 * Crea una Checkout Session en modo subscription para el DAP.
 *
 * - `customer` ya existe (lo creamos antes para reutilizarlo entre
 *   futuros checkouts y vincular el webhook).
 * - `subscription_data.metadata` propaga el userId a la Subscription
 *   que crea Stripe → el webhook lo lee para resolver a quién
 *   pertenece.
 */
export async function createSubscriptionCheckoutSession(opts: {
  customerId: string;
  userId: string;
  priceId: string;
  appUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { customerId, userId, priceId, appUrl } = opts;
  return await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/suscribirme/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/suscribirme`,
    locale: "es",
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
    billing_address_collection: "auto",
    // Habilita el campo "Añadir código promocional" en el checkout.
    // Los códigos se administran desde el Stripe Dashboard (Products →
    // Coupons → Promotion Codes). Para becas se crea un coupon de 100%
    // off duration=forever, y dos promotion codes (DAP-HONOR, DAP-VIP)
    // apuntando a ese mismo coupon. El alumno que ingresa el código
    // queda con sub activa pero invoice de $0 mes a mes.
    allow_promotion_codes: true,
  });
}
