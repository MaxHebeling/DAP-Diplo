import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEnrollmentOpen } from "@/lib/launch/config";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createPreapproval } from "@/lib/mercadopago/preapproval";
import { MP_CURRENCY, MP_MONTHLY_ARS } from "@/lib/mercadopago/config";
import { validateCoupon, applyCoupon } from "@/lib/coupons/validate";

export const runtime = "nodejs";

/**
 * POST /api/checkout/create-mp-subscription
 *
 * Crea un Preapproval en Mercado Pago AR y redirige al alumno a la
 * página de autorización (init_point). El alumno mete la tarjeta en
 * la página de MP. Cuando autoriza, MP nos avisa por webhook y nuestra
 * fila en `subscriptions` queda con status=active.
 *
 * Acepta cupones DAP-HONOR / DAP-VIP — si el cupón es válido, el
 * preapproval se crea con monto 0 (mismo efecto que en Stripe).
 *
 * Sigue el mismo patrón de gates que /api/checkout/create-subscription
 * (Stripe): enrollment open + rate limit + login + sin sub activa.
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

  // Cortocircuito si ya tiene sub activa (Stripe o MP). Solo bloqueamos
  // si está active/trialing — pending no bloquea (alumno abandonó flow,
  // permitimos reintentar).
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
    // Body vacío → sin cupón. OK.
  }
  const coupon = validateCoupon(couponRaw);
  const amountArs = applyCoupon(MP_MONTHLY_ARS, coupon);

  // MP requiere un monto > 0 incluso para preapproval. Para cupones
  // 100% off, usamos $1 ARS (centavo simbólico) y lo refundeamos vía
  // admin si llegara a cobrarse. Alternativa: marcar la fila como
  // 'active' manualmente sin pasar por MP. Por integridad de webhook
  // y para que el alumno tenga el flow completo, usamos $1 simbólico.
  const finalAmount = coupon.valid ? 1 : amountArs;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const backUrl = `${appUrl}/suscribirme/exito?source=mp`;

  let preapproval;
  try {
    preapproval = await createPreapproval({
      userId: user.id,
      payerEmail: user.email,
      amountArs: finalAmount,
      backUrl,
      reason: coupon.valid
        ? `DAP — Beca ${coupon.code} (suscripción mensual simbólica)`
        : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error("[mp.create] preapproval failed:", msg);
    return NextResponse.json(
      { error: `No se pudo crear la suscripción en Mercado Pago: ${msg}` },
      { status: 502 },
    );
  }

  // Persistimos la fila en estado pending. El webhook la actualizará
  // a active cuando el alumno autorice.
  const admin = createAdminClient();
  const { error: insertErr } = await admin.from("subscriptions").insert({
    user_id: user.id,
    payment_processor: "mercadopago",
    mp_preapproval_id: preapproval.id,
    mp_payer_id: preapproval.payer_id?.toString() ?? null,
    status: "pending",
    currency: MP_CURRENCY,
    amount_minor: finalAmount * 100, // ARS pesos enteros → centavos
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
  });
  if (insertErr) {
    console.error("[mp.create] insert subs failed:", insertErr.message);
    return NextResponse.json(
      { error: `No se pudo persistir la suscripción: ${insertErr.message}` },
      { status: 500 },
    );
  }

  // Redirigimos al alumno a la página de autorización de MP.
  return NextResponse.redirect(preapproval.init_point, { status: 303 });
}
