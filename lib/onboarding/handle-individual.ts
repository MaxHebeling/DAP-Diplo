import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createSubscriptionCheckoutSession } from "@/lib/stripe/api";
import { createPreapproval } from "@/lib/mercadopago/preapproval";
import { createPreference } from "@/lib/mercadopago/preference";
import { MP_MONTHLY_ARS } from "@/lib/mercadopago/config";
import { applyCoupon, validateCoupon } from "@/lib/coupons/validate";
import { sendMpVoucherEmail } from "@/lib/email/send-mp-voucher";

import type { IndividualPayload } from "./schemas";

const HUNDRED_YEARS_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export type HandleIndividualResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string; status: number };

/**
 * Flow individual post-signup. Branch por país y método:
 *
 *   - AR + cupón válido → beca, skipea MP, sub activa +100 años
 *   - AR + 'cash' → MP Checkout Pro (one-shot, voucher por email)
 *   - AR + 'card' (default) → MP Preapproval (auto-cobro tarjeta/saldo)
 *   - resto del mundo → Stripe Checkout Session
 */
export async function handleIndividual(
  data: IndividualPayload,
  user: User,
  stripeCustomerId: string,
  appUrl: string,
): Promise<HandleIndividualResult> {
  if (data.countryCode === "AR") {
    return await handleIndividualArgentina(data, user, stripeCustomerId, appUrl);
  }
  return await handleStripeCheckout({
    user,
    stripeCustomerId,
    appUrl,
  });
}

async function handleIndividualArgentina(
  data: IndividualPayload,
  user: User,
  stripeCustomerId: string,
  appUrl: string,
): Promise<HandleIndividualResult> {
  const coupon = validateCoupon(data.coupon ?? null);
  const baseAmount = MP_MONTHLY_ARS;
  const amountAfterCoupon = applyCoupon(baseAmount, coupon);
  const paymentMethod = data.paymentMethod ?? "card";

  // Beca 100% — DAP-VIP / DAP-HONOR. MP rechaza preapproval < $15 ARS,
  // así que activamos sub directo +100 años en lugar de "$1 simbólico".
  if (coupon.valid) {
    return await grantIndividualScholarship({
      userId: user.id,
      stripeCustomerId,
      appUrl,
    });
  }

  if (paymentMethod === "cash") {
    return await startIndividualCash({
      userId: user.id,
      payerEmail: data.email,
      amountArs: amountAfterCoupon,
      stripeCustomerId,
      appUrl,
    });
  }

  return await startIndividualCard({
    userId: user.id,
    payerEmail: data.email,
    amountArs: amountAfterCoupon,
    stripeCustomerId,
    appUrl,
  });
}

async function grantIndividualScholarship({
  userId,
  stripeCustomerId,
  appUrl,
}: {
  userId: string;
  stripeCustomerId: string;
  appUrl: string;
}): Promise<HandleIndividualResult> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const farFuture = new Date(Date.now() + HUNDRED_YEARS_MS).toISOString();
  const { error: insErr } = await admin.from("subscriptions").insert({
    user_id: userId,
    payment_processor: "mercadopago",
    payment_method: "checkout_pro",
    status: "active",
    currency: "ARS",
    amount_minor: 0,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: null,
    stripe_price_id: null,
    started_at: nowIso,
    current_period_start: nowIso,
    current_period_end: farFuture,
  });
  if (insErr) {
    return {
      ok: false,
      status: 500,
      error: `No se pudo registrar la beca: ${insErr.message}`,
    };
  }
  return {
    ok: true,
    checkoutUrl: `${appUrl}/dashboard?toast=beca-activa`,
  };
}

async function startIndividualCash({
  userId,
  payerEmail,
  amountArs,
  stripeCustomerId,
  appUrl,
}: {
  userId: string;
  payerEmail: string;
  amountArs: number;
  stripeCustomerId: string;
  appUrl: string;
}): Promise<HandleIndividualResult> {
  const admin = createAdminClient();
  let preferenceUrl: string | null = null;
  let preferenceId: string | null = null;
  try {
    const preference = await createPreference({
      userId,
      payerEmail,
      amountArs,
      successUrl: `${appUrl}/dashboard?toast=mp-paid`,
      failureUrl: `${appUrl}/suscribirme?error=mp-cash`,
      pendingUrl: `${appUrl}/dashboard?toast=mp-pending`,
      itemTitle: "DAP — Suscripción mensual (primer pago)",
    });
    preferenceUrl = preference.init_point;
    preferenceId = preference.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando preference MP";
    return { ok: false, status: 502, error: msg };
  }

  const nowIso = new Date().toISOString();
  const { error: subErr } = await admin.from("subscriptions").insert({
    user_id: userId,
    payment_processor: "mercadopago",
    payment_method: "checkout_pro",
    mp_preference_id: preferenceId,
    status: "pending",
    currency: "ARS",
    amount_minor: amountArs * 100,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: null,
    stripe_price_id: null,
    last_voucher_sent_at: nowIso,
  });
  if (subErr) {
    return {
      ok: false,
      status: 500,
      error: `No se pudo registrar la suscripción: ${subErr.message}`,
    };
  }

  // Voucher por email — el alumno puede pagar más tarde.
  void sendMpVoucherEmail({
    userId,
    checkoutUrl: preferenceUrl!,
    amountArs,
    kind: "initial",
    currentPeriodEnd: null,
  });

  return { ok: true, checkoutUrl: preferenceUrl };
}

async function startIndividualCard({
  userId,
  payerEmail,
  amountArs,
  stripeCustomerId,
  appUrl,
}: {
  userId: string;
  payerEmail: string;
  amountArs: number;
  stripeCustomerId: string;
  appUrl: string;
}): Promise<HandleIndividualResult> {
  const admin = createAdminClient();
  let preapprovalUrl: string | null = null;
  let preapprovalId: string | null = null;
  try {
    const preapproval = await createPreapproval({
      userId,
      payerEmail,
      amountArs,
      backUrl: `${appUrl}/dashboard?toast=mp-paid`,
    });
    preapprovalUrl = preapproval.init_point;
    preapprovalId = preapproval.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando preapproval MP";
    return { ok: false, status: 502, error: msg };
  }

  // Persistir fila pending — webhook MP la activa post-pago.
  const { error: subErr } = await admin.from("subscriptions").insert({
    user_id: userId,
    payment_processor: "mercadopago",
    payment_method: "preapproval",
    mp_preapproval_id: preapprovalId,
    status: "pending",
    currency: "ARS",
    amount_minor: amountArs * 100,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: null,
    stripe_price_id: null,
  });
  if (subErr) {
    // NO silenciar: sin fila pending el webhook MP no puede activar la
    // sub → user paga y queda sin acceso.
    console.error(`[onboarding] insert MP sub falló: ${subErr.message}`);
    return {
      ok: false,
      status: 500,
      error: `No se pudo registrar la suscripción: ${subErr.message}`,
    };
  }

  return { ok: true, checkoutUrl: preapprovalUrl };
}

async function handleStripeCheckout({
  user,
  stripeCustomerId,
  appUrl,
}: {
  user: User;
  stripeCustomerId: string;
  appUrl: string;
}): Promise<HandleIndividualResult> {
  const priceId = process.env.STRIPE_DAP_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    return {
      ok: false,
      status: 500,
      error: "STRIPE_DAP_SUBSCRIPTION_PRICE_ID no configurado.",
    };
  }
  try {
    const session = await createSubscriptionCheckoutSession({
      customerId: stripeCustomerId,
      userId: user.id,
      priceId,
      appUrl,
    });
    if (!session.url) {
      return {
        ok: false,
        status: 502,
        error: "Stripe no devolvió URL de checkout.",
      };
    }
    return { ok: true, checkoutUrl: session.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando sesión";
    return { ok: false, status: 502, error: msg };
  }
}
