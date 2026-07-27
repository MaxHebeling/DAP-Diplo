"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ToggleResult = { ok: true; simplifiedMode: boolean } | { ok: false; error: string };

/**
 * Activa o desactiva el modo simplificado (adultos mayores) para un alumno.
 * Solo admin. Toggle es reversible en cualquier momento; el progreso se
 * preserva — is_module_approved RPC respeta el flag al evaluar completitud.
 */
export async function toggleSimplifiedModeAction(
  userId: string,
  value: boolean,
): Promise<ToggleResult> {
  const { admin: isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "Solo admin" };
  if (!userId) return { ok: false, error: "userId requerido" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ simplified_mode: value, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/admisiones", "layout");
  return { ok: true, simplifiedMode: value };
}
