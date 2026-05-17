import Stripe from "stripe";

let _stripe: Stripe | undefined;

/**
 * Cliente Stripe lazy (no se construye en module-load).
 * Razón: Next collecting-page-data importa los módulos al build incluso
 * cuando STRIPE_SECRET_KEY no está disponible (preview deploys, etc.).
 * Solo usar server-side.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY no está configurado. Añadirlo a .env.local y a Vercel.",
    );
  }
  _stripe = new Stripe(apiKey, {
    typescript: true,
    // En serverless (Vercel) el httpClient default (Node http) sufre
    // "connection error retried 2 times" tras cold start por keepAlive
    // sockets caídos. fetch evita el problema.
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: {
      name: "DAP — Diplomado Apostólico Pastoral",
      url: process.env.NEXT_PUBLIC_APP_URL,
    },
  });
  return _stripe;
}
