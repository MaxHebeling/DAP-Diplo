"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  requestPasswordResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/auth/schemas";

export type AuthFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const FALLBACK_REDIRECT = "/dashboard";

function safeRedirectTo(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return FALLBACK_REDIRECT;
  if (!value.startsWith("/") || value.startsWith("//")) return FALLBACK_REDIRECT;
  return value;
}

export async function signUpAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    ministryName: formData.get("ministryName"),
    country: formData.get("country"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // El trigger handle_new_user() lee full_name, ministry_name y country
      // desde raw_user_meta_data y los inserta en profiles en un solo paso.
      data: {
        full_name: parsed.data.fullName,
        ministry_name: parsed.data.ministryName ?? null,
        country: parsed.data.country,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const redirectTo = safeRedirectTo(formData.get("redirectTo"));
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signInAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: "Correo o contraseña incorrectos" };
  }

  const redirectTo = safeRedirectTo(formData.get("redirectTo"));
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Solicita un email con link de recuperación. SIEMPRE devuelve ok aunque
 * el email no exista (anti-enumeration): el alumno nunca ve si el email
 * estaba registrado o no.
 */
export async function requestPasswordResetAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";
  // El email mandará al usuario a /auth/callback?code=...&next=/reset-password/update
  // El callback hace exchange y redirige al form de nueva contraseña.
  const redirectTo = `${baseUrl}/auth/callback?next=/reset-password/update`;

  // Mandamos el reset; si falla por email inexistente, no leakeamos.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  return { ok: true };
}

/**
 * Setea nueva contraseña. Asume que el alumno está en una sesión
 * "recovery" (creada al clickear el link del email).
 */
export async function updatePasswordAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "El link de recuperación expiró o no es válido. Pedí uno nuevo.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?toast=password-updated");
}

