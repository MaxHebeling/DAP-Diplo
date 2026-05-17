import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { createSubscriptionCheckoutSession } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

  // DIAG: test fetch directo a Stripe para aislar si es problema del SDK o de red
  try {
    const sk = process.env.STRIPE_SECRET_KEY ?? "";
    const t0 = Date.now();
    const r = await fetch("https://api.stripe.com/v1/customers?limit=1", {
      method: "GET",
      headers: { Authorization: `Bearer ${sk}` },
    });
    console.log(
      "[create-subscription] DIAG direct-fetch:",
      r.status,
      "in",
      Date.now() - t0,
      "ms",
    );
  } catch (e) {
    console.error("[create-subscription] DIAG direct-fetch FAILED:", {
      name: (e as { name?: string })?.name,
      message: (e as { message?: string })?.message,
      cause: (e as { cause?: unknown })?.cause,
    });
  }

  const stripe = getStripe();
  let stripeCustomerId = profile.stripe_customer_id as string | null;

  // Crea Stripe Customer la primera vez. Persiste en profiles para
  // reutilizar en futuros checkouts y vincular con el webhook.
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile.full_name ?? undefined,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      const admin = createAdminClient();
      const { error: updateErr } = await admin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
      if (updateErr) {
        console.error(
          "[create-subscription] no se pudo guardar stripe_customer_id en profile:",
          updateErr.message,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error creando Customer";
      // Dump exhaustivo para diagnosticar errores de SDK en serverless
      console.error("[create-subscription] customers.create FAILED:", {
        msg,
        name: (err as { name?: string })?.name,
        code: (err as { code?: string })?.code,
        type: (err as { type?: string })?.type,
        statusCode: (err as { statusCode?: number })?.statusCode,
        requestId: (err as { requestId?: string })?.requestId,
        cause: (err as { cause?: unknown })?.cause,
        envPresent: {
          STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
          STRIPE_SECRET_KEY_len: process.env.STRIPE_SECRET_KEY?.length ?? 0,
          STRIPE_SECRET_KEY_prefix: process.env.STRIPE_SECRET_KEY?.slice(0, 8),
          PRICE_ID: process.env.STRIPE_DAP_SUBSCRIPTION_PRICE_ID,
        },
      });
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
    console.error("[create-subscription] sessions.create:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
