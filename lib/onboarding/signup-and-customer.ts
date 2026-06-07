import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createStripeCustomer } from "@/lib/stripe/api";
import type { OnboardingPayload, MarriagePayload } from "./schemas";
import { isMarriagePayload } from "./schemas";

export type SignupResult =
  | { ok: true; user: User; stripeCustomerId: string }
  | { ok: false; error: string; status: number };

/**
 * Combina los pasos 1+2 del onboarding:
 *   1) supabase.auth.signUp (con user_metadata según individual/matrimonio)
 *   2) createStripeCustomer + persist stripe_customer_id en profile
 *
 * Devuelve `{ ok: true, user, stripeCustomerId }` para que el caller
 * orqueste los siguientes pasos (marriage_registration / subscription /
 * checkout MP o Stripe). Si signUp detecta email duplicado responde 409
 * con mensaje listo para mostrar al alumno.
 */
export async function signupAndCreateCustomer(
  supabase: SupabaseClient,
  data: OnboardingPayload,
): Promise<SignupResult> {
  // 1. Build user_metadata
  const userMetadata: Record<string, unknown> = {
    full_name: data.fullName,
    ministry_name: data.ministryName,
    country: data.country,
    country_code: data.countryCode,
  };
  if (isMarriagePayload(data)) {
    const m = data as MarriagePayload;
    userMetadata.spouse_role = "spouse_1";
    userMetadata.province = m.spouse1.province;
    userMetadata.phone = m.spouse1.phone;
  }

  // 2. Signup
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
      return {
        ok: false,
        status: 409,
        error:
          "Ya existe una cuenta con ese email. Iniciá sesión y suscribite desde tu dashboard.",
      };
    }
    return {
      ok: false,
      status: 500,
      error: `No se pudo crear la cuenta: ${signUpErr.message}`,
    };
  }

  const user = signUpData.user;
  if (!user) {
    return {
      ok: false,
      status: 500,
      error: "Supabase no devolvió usuario tras signUp.",
    };
  }

  // 3. Stripe Customer
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
    return { ok: false, status: 500, error: msg };
  }

  // 4. Persistir stripe_customer_id en profile (admin client porque
  //    profile fue creado por trigger handle_new_user con RLS apretada)
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", user.id);

  return { ok: true, user, stripeCustomerId };
}
