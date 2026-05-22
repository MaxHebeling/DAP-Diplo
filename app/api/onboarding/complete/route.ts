import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createStripeCustomer,
  createSubscriptionCheckoutSession,
} from "@/lib/stripe/api";

export const runtime = "nodejs";

const payloadSchema = z.object({
  email: z.string().email("Email inválido").max(120),
  password: z.string().min(8, "Mínimo 8 caracteres").max(80),
  fullName: z.string().min(3, "Nombre muy corto").max(120),
  ministryName: z.string().max(120).nullable(),
  country: z.string().min(1).max(80),
  countryCode: z.string().length(2),
});

/**
 * Endpoint atómico del onboarding modal:
 *   1. Crea cuenta Supabase (signUp) con país + ministerio en metadata
 *   2. Crea Stripe Customer
 *   3. Crea Stripe Checkout Session
 *   4. Devuelve la URL de Stripe al cliente para redirigir
 *
 * Si signUp falla porque el email ya existe → devuelve error claro.
 * Si Stripe falla después de crear cuenta → la cuenta queda y el
 * alumno puede ir a /suscribirme después (estado intermedio aceptable).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const supabase = await createClient();

  // 1. Signup — establece sesión por cookies automáticamente
  const { error: signUpErr, data: signUpData } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        ministry_name: data.ministryName,
        country: data.country,
        country_code: data.countryCode,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
  });

  if (signUpErr) {
    const lower = signUpErr.message.toLowerCase();
    if (lower.includes("already") || lower.includes("registered")) {
      return NextResponse.json(
        {
          error:
            "Ya existe una cuenta con ese email. Iniciá sesión y suscribite desde tu dashboard.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: `No se pudo crear la cuenta: ${signUpErr.message}` },
      { status: 500 },
    );
  }

  const user = signUpData.user;
  if (!user) {
    return NextResponse.json(
      { error: "Supabase no devolvió usuario tras signUp." },
      { status: 500 },
    );
  }

  // 2. Stripe Customer (idempotent on email)
  const priceId = process.env.STRIPE_DAP_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_DAP_SUBSCRIPTION_PRICE_ID no configurado." },
      { status: 500 },
    );
  }

  let stripeCustomerId: string;
  try {
    const customer = await createStripeCustomer({
      email: data.email,
      name: data.fullName,
      userId: user.id,
    });
    stripeCustomerId = customer.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando Customer";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Persist stripe_customer_id en profile (usamos admin client porque
  // el trigger handle_new_user ya corrió pero el row puede estar siendo
  // commited en este mismo instante — admin client evita race con RLS)
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", user.id);

  // 3. Stripe Checkout Session
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  let checkoutUrl: string | null = null;
  try {
    const session = await createSubscriptionCheckoutSession({
      customerId: stripeCustomerId,
      userId: user.id,
      priceId,
      appUrl,
    });
    checkoutUrl = session.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando sesión";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "Stripe no devolvió URL de checkout." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, checkoutUrl });
}
