/**
 * Cliente Stripe minimalista basado en fetch directo a la API REST.
 *
 * Razón: el SDK oficial (`stripe` npm) en Vercel serverless arroja
 * `StripeConnectionError: Request was retried 2 times.` de forma
 * persistente y reproducible incluso con `createFetchHttpClient()`.
 * Un `fetch()` directo desde la misma función responde 200 en <200ms
 * — eso descarta network/firewall y deja al SDK como la causa.
 *
 * Las llamadas que necesitamos (Customers, Checkout Sessions) son
 * simples POST a la API REST con `application/x-www-form-urlencoded`.
 * Stripe SDK se sigue usando para `webhooks.constructEvent` (CPU only).
 */

const BASE = "https://api.stripe.com/v1";

async function stripeRequest<T>(
  path: string,
  body: Record<string, string>,
): Promise<T> {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    throw new Error("STRIPE_SECRET_KEY no está configurado.");
  }

  const form = new URLSearchParams(body);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const json = (await res.json()) as
    | T
    | { error?: { message?: string; type?: string; code?: string } };

  if (!res.ok) {
    const err = (json as { error?: { message?: string } }).error;
    const msg = err?.message ?? `Stripe HTTP ${res.status}`;
    const error = new Error(msg);
    (error as { stripeStatus?: number }).stripeStatus = res.status;
    throw error;
  }
  return json as T;
}

// --- Customers ------------------------------------------------------

export type StripeCustomer = {
  id: string;
  email: string | null;
};

export async function createStripeCustomer(opts: {
  email: string;
  name?: string;
  userId: string;
}): Promise<StripeCustomer> {
  const body: Record<string, string> = {
    email: opts.email,
    "metadata[userId]": opts.userId,
  };
  if (opts.name) body.name = opts.name;
  return stripeRequest<StripeCustomer>("/customers", body);
}

// --- Billing Portal Sessions ----------------------------------------

export type StripeBillingPortalSession = {
  id: string;
  url: string;
  customer: string;
};

/**
 * Crea una Customer Portal session hosted por Stripe. El alumno
 * puede ver facturas, actualizar tarjeta y cancelar la suscripción.
 *
 * Requiere que el Customer Portal esté CONFIGURADO en Stripe Dashboard
 * (Settings → Billing → Customer Portal). Sin esa configuración, este
 * call falla con error explícito.
 */
export async function createBillingPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<StripeBillingPortalSession> {
  return stripeRequest<StripeBillingPortalSession>("/billing_portal/sessions", {
    customer: opts.customerId,
    return_url: opts.returnUrl,
    locale: "es",
  });
}

// --- Checkout Sessions ----------------------------------------------

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  mode: string;
};

// --- Subscriptions --------------------------------------------------

export type StripeSubscriptionMinimal = {
  id: string;
  status: string;
};

/**
 * Cancela una suscripción inmediatamente (no waits for period end).
 * El alumno pierde acceso. Su progreso (module_progress, etc.) se conserva
 * en nuestra DB para cuando reactive.
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<StripeSubscriptionMinimal> {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) throw new Error("STRIPE_SECRET_KEY no está configurado.");
  const res = await fetch(`${BASE}/subscriptions/${subscriptionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sk}` },
  });
  const json = (await res.json()) as
    | StripeSubscriptionMinimal
    | { error?: { message?: string } };
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } }).error?.message ??
      `Stripe HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as StripeSubscriptionMinimal;
}

export async function createSubscriptionCheckoutSession(opts: {
  customerId: string;
  userId: string;
  priceId: string;
  appUrl: string;
}): Promise<StripeCheckoutSession> {
  const { customerId, userId, priceId, appUrl } = opts;
  const body: Record<string, string> = {
    mode: "subscription",
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/suscribirme/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/suscribirme`,
    locale: "es",
    client_reference_id: userId,
    "metadata[userId]": userId,
    "subscription_data[metadata][userId]": userId,
    billing_address_collection: "auto",
  };
  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", body);
}
