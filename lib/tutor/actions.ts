"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { admin: false as const, userId: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return { admin: profile?.role === "admin", userId: user.id };
}

const deleteSchema = z.object({ id: z.uuid() });

export async function deleteDocumentSourceAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "ID inválido." };

  const { admin } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const adminClient = createAdminClient();

  // Carga el source para conocer storage_path
  const { data: source, error: srcErr } = await adminClient
    .from("ai_document_sources")
    .select("id, storage_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (srcErr) return { ok: false, error: srcErr.message };
  if (!source) return { ok: false, error: "Documento no encontrado." };

  // 1) Borra el source (cascade ON DELETE elimina los chunks en ai_documents)
  const { error: delErr } = await adminClient
    .from("ai_document_sources")
    .delete()
    .eq("id", source.id);
  if (delErr) return { ok: false, error: delErr.message };

  // 2) Borra el PDF original del Storage (best-effort, no rollback si falla)
  if (source.storage_path) {
    const { error: storageErr } = await adminClient.storage
      .from("ai-documents")
      .remove([source.storage_path]);
    if (storageErr) {
      console.error(
        "[deleteDocumentSourceAction] storage cleanup falló:",
        storageErr.message,
      );
    }
  }

  revalidatePath("/admin/tutor/documentos");
  return { ok: true };
}
