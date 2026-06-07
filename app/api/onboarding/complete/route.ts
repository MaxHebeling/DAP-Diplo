import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  ENROLLMENT_OPENS_LABEL,
  isEnrollmentOpen,
} from "@/lib/launch/config";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  isMarriagePayload,
  payloadSchema,
} from "@/lib/onboarding/schemas";
import { validateMarriageInputs } from "@/lib/onboarding/validate-marriage";
import { signupAndCreateCustomer } from "@/lib/onboarding/signup-and-customer";
import { handleMarriage } from "@/lib/onboarding/handle-marriage";
import { handleIndividual } from "@/lib/onboarding/handle-individual";

export const runtime = "nodejs";

/**
 * Endpoint del onboarding modal.
 *
 * Orquesta:
 *   1) Launch gate + rate limit + parse + validación cross-field
 *   2) signUp + Stripe customer (`signupAndCreateCustomer`)
 *   3) Branch matrimonio AR (`handleMarriage`) — registration + cupón/MP
 *   4) Branch individual (`handleIndividual`) — AR (cupón/MP) o Stripe USD
 *
 * El detalle de cada branch vive en `lib/onboarding/`. Este route solo
 * orquesta y normaliza la respuesta `{checkoutUrl}`. Para la provisión
 * del cónyuge 2 post-pago, ver el webhook MP en
 * `app/api/webhooks/mercadopago`.
 */
export async function POST(request: NextRequest) {
  // Defense in depth: el gate del launch también corta acá, no solo en UI.
  if (!isEnrollmentOpen()) {
    return NextResponse.json(
      { error: `Las inscripciones abren el ${ENROLLMENT_OPENS_LABEL}.` },
      { status: 403 },
    );
  }

  // Rate limit: 5 attempts / 10 min por IP. Signup es poco frecuente.
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

  // Parse + Zod
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

  // Validación cross-field específica de matrimonio
  if (isMarriagePayload(data)) {
    const err = validateMarriageInputs(data, request);
    if (err) {
      return NextResponse.json({ error: err.error }, { status: err.status });
    }
  }

  // Signup + Stripe customer
  const supabase = await createClient();
  const signup = await signupAndCreateCustomer(supabase, data);
  if (!signup.ok) {
    return NextResponse.json({ error: signup.error }, { status: signup.status });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  // Branch: matrimonio vs individual
  const result = isMarriagePayload(data)
    ? await handleMarriage(
        request,
        data,
        signup.user,
        signup.stripeCustomerId,
        appUrl,
      )
    : await handleIndividual(
        data,
        signup.user,
        signup.stripeCustomerId,
        appUrl,
      );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, checkoutUrl: result.checkoutUrl });
}
