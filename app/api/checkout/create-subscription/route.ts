import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createStripeCustomer,
  createSubscriptionCheckoutSession,
} from "@/lib/stripe/api";
import { isEnrollmentOpen } from "@/lib/launch/config";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Gate de lanzamiento: hasta la fecha de apertura, ningún checkout
  // se procesa aunque alguien intente POSTear directo. Devolvemos a la
  // página /suscribirme que ya muestra el cartel "Inscripciones abren…".
  if (!isEnrollmentOpen()) {
    const url = new URL("/suscribirme", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Rate limit: 10 attempts cada 10 min por IP. Un alumno logueado puede
  // navegar a /suscribirme varias veces; 10 cubre intentos legítimos sin
  // permitir bombardeo automatizado al endpoint de Stripe.
  const limit = await checkRateLimit(request, {
    scope: "create-subscription",
    max: 10,
    windowSeconds: 600,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos y volvé a intentar." },
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

  // Cortocircuito si ya tiene suscripción activa.
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

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr || !profile) {
    return NextResponse.json(
      { error: "Perfil no encontrado." },
      { status: 404 },
    );
  }

  const priceId = process.env.STRIPE_DAP_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_DAP_SUBSCRIPTION_PRICE_ID no configurado." },
      { status: 500 },
    );
  }

  let stripeCustomerId = profile.stripe_customer_id as string | null;

  // Primer checkout: crea el Customer y persíntelo en el profile.
  if (!stripeCustomerId) {
    try {
      const customer = await createStripeCustomer({
        email: user.email,
        name: profile.full_name ?? undefined,
        userId: user.id,
      });
      stripeCustomerId = customer.id;
      const admin = createAdminClient();
      const { error: updateErr } = await admin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
      if (updateErr) {
        console.error(
          "[create-subscription] no se pudo guardar stripe_customer_id:",
          updateErr.message,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error creando Customer";
      console.error("[create-subscription] createStripeCustomer FAILED:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    const session = await createSubscriptionCheckoutSession({
      customerId: stripeCustomerId,
      userId: user.id,
      priceId,
      appUrl,
    });
    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe no devolvió URL de checkout." },
        { status: 502 },
      );
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando sesión.";
    console.error("[create-subscription] sessions.create FAILED:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
