import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type RequireAdminResult = {
  admin: boolean;
  supabase: SupabaseClient;
  userId: string | null;
};

/**
 * Server-side check: ¿el caller es admin?
 *
 * Devuelve siempre `supabase` (creado una sola vez, reusable por el
 * llamador) y `userId` (null si no autenticado). El guard es:
 *
 *   const { admin, supabase, userId } = await requireAdmin();
 *   if (!admin) return ... // 403 / ActionResult error / etc.
 *
 * No fuerza una respuesta de error porque cada contexto la formatea
 * distinto: Server Actions devuelven `{ok:false, error}`, Route
 * Handlers responden `NextResponse.json(..., {status:403})`.
 *
 * Reemplaza las 4 copias privadas de `ensureAdmin()` y los guards
 * inline en routes API (drift garantizado si cada uno tuneaba la
 * lógica de rol por su cuenta).
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { admin: false, supabase, userId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  return {
    admin: profile?.role === "admin",
    supabase,
    userId: user.id,
  };
}
