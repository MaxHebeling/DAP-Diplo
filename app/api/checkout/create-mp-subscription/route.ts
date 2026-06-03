import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEnrollmentOpen } from "@/lib/launch/config";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createPreference } from "@/lib/mercadopago/preference";
import { sendMpVoucherEmail } from "@/lib/email/send-mp-voucher";
import { MP_CURRENCY, MP_MONTHLY_ARS } from "@/lib/mercadopago/config";
import { validateCoupon, applyCoupon } from "@/lib/coupons/validate";

export const runtime = "nodejs";

/**
 * POST /api/checkout/create-mp-subscription
 *
 * Crea una Preference (Checkout Pro) en Mercado Pago AR y redirige al
 * alumno al init_point. MP muestra: saldo MP, transferencia (CVU/CBU),
 * RapiPago, PagoFácil, Western Union, Pago Mis Cuentas. SIN tarjetas
 * (decisión DAP — el preapproval con tarjeta rebotaba demasiado).
 *
 * Cupones DAP-HONOR / DAP-VIP → SKIP MP entero, activa sub directo.
 *
 * Nota: se llama "create-mp-subscription" por legacy. En realidad ya no
 * es Preapproval — usa Checkout Pro one-shot mensual. El renovado se
 * maneja por el cron `mp-monthly-voucher` que genera nueva Preference
 * cada mes 5 días antes del vencimiento.
 */
export async function POST(request: NextRequest) {
  if (!isEnrollmentOpen()) {
    const url = new URL("/suscribirme", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  const limit = await checkRateLimit(request, {
    scope: "create-mp-subscription",
    max: 10,
    windowSeconds: 600,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    const url = new URL("/login?redirectTo=/suscribirme", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Cortocircuito si ya tiene sub active/trialing.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  const stillActive =
    !!existing &&
    (existing.current_period_end === null ||
      new Date(existing.current_period_end) > new Date());
  if (stillActive) {
    const url = new URL("/dashboard?toast=already-subscribed", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Cupón opcional desde form-data o JSON body.
  let couponRaw: string | null = null;
  const ct = request.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = (await request.json()) as { coupon?: string };
      couponRaw = j.coupon ?? null;
    } else {
      const form = await request.formData();
      couponRaw = (form.get("coupon") as string | null) ?? null;
    }
  } catch {
    // OK sin cupón.
  }
  const coupon = validateCoupon(couponRaw);
  const amountArs = applyCoupon(MP_MONTHLY_ARS, coupon);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  const admin = createAdminClient();

  // BECA con cupón válido → SKIP MP, activa sub directo +100 años.
  if (coupon.valid) {
    const nowIso = new Date().toISOString();
    const farFuture = new Date(
      Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error: insErr } = await admin.from("subscriptions").insert({
      user_id: user.id,
      payment_processor: "mercadopago",
      payment_method: "checkout_pro",
      status: "active",
      currency: MP_CURRENCY,
      amount_minor: 0,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      started_at: nowIso,
      current_period_start: nowIso,
      current_period_end: farFuture,
    });
    if (insErr) {
      return NextResponse.json(
        { error: `No se pudo registrar la beca: ${insErr.message}` },
        { status: 500 },
      );
    }
    return NextResponse.redirect(
      new URL("/dashboard?toast=beca-activa", request.url),
      { status: 303 },
    );
  }

  // Flujo normal: Preference Checkout Pro.
  let preference;
  try {
    preference = await createPreference({
      userId: user.id,
      payerEmail: user.email,
      amountArs,
      successUrl: `${appUrl}/dashboard?toast=mp-paid`,
      failureUrl: `${appUrl}/suscribirme?error=mp-cash`,
      pendingUrl: `${appUrl}/dashboard?toast=mp-pending`,
      itemTitle: "DAP — Suscripción mensual",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando preference MP";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Persistir fila pending.
  const { error: subErr } = await admin.from("subscriptions").insert({
    user_id: user.id,
    payment_processor: "mercadopago",
    payment_method: "checkout_pro",
    mp_preference_id: preference.id,
    status: "pending",
    currency: MP_CURRENCY,
    amount_minor: amountArs * 100,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    last_voucher_sent_at: new Date().toISOString(),
  });
  if (subErr) {
    return NextResponse.json(
      { error: `No se pudo registrar la suscripción: ${subErr.message}` },
      { status: 500 },
    );
  }

  // Mandar voucher email (backup por si pierden el redirect).
  void sendMpVoucherEmail({
    userId: user.id,
    checkoutUrl: preference.init_point,
    amountArs,
    kind: "initial",
    currentPeriodEnd: null,
  });

  return NextResponse.redirect(preference.init_point, { status: 303 });
}
