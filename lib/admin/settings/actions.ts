"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SettingResult =
  | { ok: true }
  | { ok: false; error: string };

const upsertSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(20).max(20_000),
});

/**
 * Upsert key/value en admin_settings. Auth: admin only via RLS de la
 * tabla (la policy exige is_admin()).
 */
export async function upsertAdminSettingAction(
  formData: FormData,
): Promise<SettingResult> {
  const parsed = upsertSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      {
        key: parsed.data.key,
        value: parsed.data.value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/excorrector`);
  return { ok: true };
}
