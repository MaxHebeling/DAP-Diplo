"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/auth/schemas";

export type AuthFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const FALLBACK_REDIRECT = "/modulos";

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

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // El trigger handle_new_user() ya creó la fila en profiles con full_name.
  // Completamos los campos extra que el trigger no conoce.
  if (data.user) {
    await supabase
      .from("profiles")
      .update({
        ministry_name: parsed.data.ministryName ?? null,
        country: parsed.data.country,
      })
      .eq("id", data.user.id);
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

