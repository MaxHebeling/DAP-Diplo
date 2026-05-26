import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createMarriageCheckoutSession,
  createStripeCustomer,
  createSubscriptionCheckoutSession,
} from "@/lib/stripe/api";
import { AR_PROVINCES, isArgentinePhone } from "@/lib/data/argentina";
import {
  ENROLLMENT_OPENS_LABEL,
  isEnrollmentOpen,
} from "@/lib/launch/config";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const spouseSchema = z.object({
  fullName: z.string().min(3).max(120),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(40),
  province: z.string().min(1).max(80),
  ministry: z.string().max(120).nullable().optional(),
});

const basePayload = {
  email: z.string().email("Email inválido").max(120),
  password: z.string().min(8, "Mínimo 8 caracteres").max(80),
  fullName: z.string().min(3, "Nombre muy corto").max(120),
  ministryName: z.string().max(120).nullable(),
  country: z.string().min(1).max(80),
  countryCode: z.string().length(2),
};

const individualSchema = z.object({
  ...basePayload,
  registrationType: z.literal("individual").optional(),
});

const marriageSchema = z.object({
  ...basePayload,
  registrationType: z.literal("marriage"),
  declaredResidenceInAr: z.boolean(),
  spouse1: spouseSchema,
  spouse2: spouseSchema,
});

const payloadSchema = z.union([marriageSchema, individualSchema]);

/**
 * Endpoint del onboarding modal. Dos ramas:
 *
 *   - Individual (default): signUp + customer + suscripción regular.
 *   - Matrimonio Argentina: signUp del cónyuge 1 + insert en
 *     marriage_registrations (con datos de ambos) + customer + checkout
 *     especial $35/mes. La provisión de la cuenta del cónyuge 2 ocurre
 *     en el webhook tras el pago exitoso.
 *
 * GeoIP se lee de los headers Vercel (`x-vercel-ip-country`) — en
 * local devuelve null y se marca como pending_review.
 */
export async function POST(request: NextRequest) {
  // Defensa en profundidad: el gate del launch corta acá también, no
  // solo en la UI. Quien intente bypasear el modal vía curl recibe 403.
  if (!isEnrollmentOpen()) {
    return NextResponse.json(
      {
        error: `Las inscripciones abren el ${ENROLLMENT_OPENS_LABEL}.`,
      },
      { status: 403 },
    );
  }

  // Rate limit: 5 attempts cada 10 min por IP. Signup real es una acción
  // poco frecuente; 5 ya cubre retries por errores del usuario sin abrir
  // la puerta a spam de cuentas o checkouts.
  const limit = await checkRateLimit(request, {
    scope: "onboarding-complete",
    max: 5,
    windowSeconds: 600,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos y volvé a intentar." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

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
  const isMarriage =
    "registrationType" in data && data.registrationType === "marriage";

  // Guard: matrimonio solo es válido para Argentina y campos coherentes
  if (isMarriage) {
    if (data.countryCode !== "AR") {
      return NextResponse.json(
        { error: "La inscripción matrimonio es exclusiva para Argentina." },
        { status: 400 },
      );
    }
    if (!AR_PROVINCES.includes(data.spouse1.province)) {
      return NextResponse.json(
        { error: "Provincia inválida del cónyuge 1." },
        { status: 400 },
      );
    }
    if (!AR_PROVINCES.includes(data.spouse2.province)) {
      return NextResponse.json(
        { error: "Provincia inválida del cónyuge 2." },
        { status: 400 },
      );
    }
    if (!isArgentinePhone(data.spouse1.phone)) {
      return NextResponse.json(
        { error: "El teléfono del cónyuge 1 debe ser argentino (+54)." },
        { status: 400 },
      );
    }
    if (!isArgentinePhone(data.spouse2.phone)) {
      return NextResponse.json(
        { error: "El teléfono del cónyuge 2 debe ser argentino (+54)." },
        { status: 400 },
      );
    }
    if (data.spouse1.email.toLowerCase() === data.spouse2.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Los cónyuges deben tener emails distintos." },
        { status: 400 },
      );
    }
    if (!data.declaredResidenceInAr) {
      return NextResponse.json(
        { error: "Falta la confirmación de residencia en Argentina." },
        { status: 400 },
      );
    }

    // Defensa en profundidad: si GeoIP detectó un país distinto a AR,
    // rechazamos el matrimonio independientemente del cliente. GeoIP
    // null (local dev / sin header Vercel) NO bloquea.
    // !!! TEMP-SMOKE-TEST-AR !!! Bypaseado durante el smoke test.
    // REVERTIR (descomentar el bloque) cuando termine el test.
    // const geoCountry = getGeoIpCountry(request);
    // if (geoCountry && geoCountry.toUpperCase() !== "AR") {
    //   return NextResponse.json(
    //     {
    //       error: `El beneficio matrimonial es exclusivo para Argentina. Detectamos tu conexión desde ${geoCountry.toUpperCase()}.`,
    //     },
    //     { status: 403 },
    //   );
    // }
  }

  const supabase = await createClient();

  // 1. Signup cuenta primaria (spouse_1 si matrimonio)
  const userMetadata: Record<string, unknown> = {
    full_name: data.fullName,
    ministry_name: data.ministryName,
    country: data.country,
    country_code: data.countryCode,
  };
  if (isMarriage) {
    userMetadata.spouse_role = "spouse_1";
    userMetadata.province = data.spouse1.province;
    userMetadata.phone = data.spouse1.phone;
  }

  const { error: signUpErr, data: signUpData } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: userMetadata,
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

  const admin = createAdminClient();

  // 2. Stripe Customer
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

  await admin
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", user.id);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  // 3a. Rama matrimonio: persistir marriage_registration + crear checkout especial
  if (isMarriage) {
    const geoCountry = getGeoIpCountry(request);
    const verificationFlags: string[] = [];
    let verificationStatus: "verified_argentina" | "pending_review" =
      "verified_argentina";

    if (!geoCountry) {
      verificationFlags.push("geoip_unknown");
      verificationStatus = "pending_review";
    } else if (geoCountry.toUpperCase() !== "AR") {
      verificationFlags.push(`geoip_mismatch:${geoCountry}`);
      verificationStatus = "pending_review";
    }
    if (!isArgentinePhone(data.spouse1.phone)) {
      verificationFlags.push("spouse1_phone_non_ar");
      verificationStatus = "pending_review";
    }
    if (!isArgentinePhone(data.spouse2.phone)) {
      verificationFlags.push("spouse2_phone_non_ar");
      verificationStatus = "pending_review";
    }

    const { data: regRow, error: regErr } = await admin
      .from("marriage_registrations")
      .insert({
        spouse_1_user_id: user.id,
        spouse_1_full_name: data.spouse1.fullName,
        spouse_1_email: data.spouse1.email.toLowerCase(),
        spouse_1_phone: data.spouse1.phone,
        spouse_1_province: data.spouse1.province,
        spouse_1_ministry: data.spouse1.ministry ?? null,

        spouse_2_full_name: data.spouse2.fullName,
        spouse_2_email: data.spouse2.email.toLowerCase(),
        spouse_2_phone: data.spouse2.phone,
        spouse_2_province: data.spouse2.province,
        spouse_2_ministry: data.spouse2.ministry ?? null,

        country: "Argentina",
        country_code: "AR",
        geoip_country: geoCountry,
        declared_residence_in_ar: data.declaredResidenceInAr,
        verification_status: verificationStatus,
        verification_flags: verificationFlags,

        stripe_customer_id: stripeCustomerId,
        argentina_discount_applied: true,
        final_amount_usd: 35,
      })
      .select("id, marriage_group_id")
      .single<{ id: string; marriage_group_id: string }>();

    if (regErr || !regRow) {
      return NextResponse.json(
        {
          error: `No se pudo registrar el matrimonio: ${
            regErr?.message ?? "row vacía"
          }`,
        },
        { status: 500 },
      );
    }

    // Marcar spouse_1 con marriage_group_id + spouse_role
    await admin
      .from("profiles")
      .update({
        marriage_group_id: regRow.marriage_group_id,
        spouse_role: "spouse_1",
        province: data.spouse1.province,
        phone: data.spouse1.phone,
      })
      .eq("id", user.id);

    let checkoutUrl: string | null = null;
    try {
      const session = await createMarriageCheckoutSession({
        customerId: stripeCustomerId,
        userId: user.id,
        marriageGroupId: regRow.marriage_group_id,
        spouse1Email: data.email,
        spouse2Email: data.spouse2.email.toLowerCase(),
        appUrl,
      });
      checkoutUrl = session.url;
      if (session.id) {
        await admin
          .from("marriage_registrations")
          .update({ stripe_checkout_session_id: session.id })
          .eq("id", regRow.id);
      }
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

  // 3b. Rama individual: suscripción regular
  const priceId = process.env.STRIPE_DAP_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_DAP_SUBSCRIPTION_PRICE_ID no configurado." },
      { status: 500 },
    );
  }

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

function getGeoIpCountry(request: NextRequest): string | null {
  return (
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null
  );
}
