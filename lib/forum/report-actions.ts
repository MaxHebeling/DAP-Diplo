"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const reportSchema = z.object({
  post_id: z.uuid(),
  reason: z.string().trim().min(4, "Mínimo 4 caracteres").max(1000),
});

export async function reportPostAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = reportSchema.safeParse({
    post_id: formData.get("post_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { error } = await supabase.from("forum_reports").insert({
    post_id: parsed.data.post_id,
    reporter_id: user.id,
    reason: parsed.data.reason,
  });

  // El unique constraint forum_reports_unique_pending bloquea reportes
  // duplicados del mismo reporter al mismo post si todavía no se resolvió.
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Ya reportaste este post. Estamos revisándolo.",
      };
    }
    return { ok: false, error: error.message };
  }

  // No revalida la página del hilo — el reporte es privado del reporter.
  revalidatePath("/admin/comunidad");
  return { ok: true };
}
