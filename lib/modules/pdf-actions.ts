"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PdfUploadResult =
  | { ok: true; resource: { id: string; title: string; url: string } }
  | { ok: false; error: string };

const uploadSchema = z.object({
  moduleId: z.string().uuid(),
  title: z
    .string()
    .min(2, "Título mínimo 2 caracteres.")
    .max(200, "Título demasiado largo."),
});

const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Sube un PDF a Storage `module-pdfs/<moduleId>/<timestamp>-<filename>`
 * y crea/actualiza la fila correspondiente en `module_resources` con
 * kind='pdf'. Cada módulo puede tener varios PDFs (por si hay anexos).
 *
 * Auth: requiere admin. Verifica is_admin() vía profiles, defense-in-depth
 * sobre la policy de Storage.
 */
export async function uploadModulePdfAction(
  formData: FormData,
): Promise<PdfUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Solo admin." };
  }

  const parsed = uploadSchema.safeParse({
    moduleId: formData.get("moduleId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Archivo PDF requerido." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "El archivo debe ser PDF." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: "El PDF supera los 20MB." };
  }

  const admin = createAdminClient();

  // Path único: <moduleId>/<timestamp>-<safe-filename>.pdf
  const ts = Date.now();
  const safeName = file.name
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  const path = `${parsed.data.moduleId}/${ts}-${safeName}.pdf`;

  const arrayBuf = await file.arrayBuffer();
  const { error: upErr } = await admin.storage
    .from("module-pdfs")
    .upload(path, arrayBuf, {
      contentType: "application/pdf",
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) {
    return { ok: false, error: `Storage error: ${upErr.message}` };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("module-pdfs").getPublicUrl(path);

  // Calcula order_index = max actual + 1 (para que el nuevo PDF quede al
  // final por defecto). Si no hay recursos, arranca en 0.
  const { data: maxRow } = await admin
    .from("module_resources")
    .select("order_index")
    .eq("module_id", parsed.data.moduleId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ order_index: number }>();
  const nextOrder = (maxRow?.order_index ?? -1) + 1;

  const { data: inserted, error: insErr } = await admin
    .from("module_resources")
    .insert({
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
      kind: "pdf",
      url: publicUrl,
      order_index: nextOrder,
    })
    .select("id, title, url")
    .single<{ id: string; title: string; url: string }>();

  if (insErr || !inserted) {
    // Rollback: borrar el archivo recién subido para no dejar huérfano
    await admin.storage.from("module-pdfs").remove([path]);
    return {
      ok: false,
      error: `DB error: ${insErr?.message ?? "no se pudo insertar"}`,
    };
  }

  revalidatePath("/admin/fases", "layout");
  return { ok: true, resource: inserted };
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Borra un recurso (PDF) del módulo: row en DB + archivo en Storage.
 */
export async function deleteModuleResourceAction(
  resourceId: string,
): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Solo admin." };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("module_resources")
    .select("id, url, kind")
    .eq("id", resourceId)
    .maybeSingle<{ id: string; url: string; kind: string }>();
  if (!row) return { ok: false, error: "Recurso no encontrado." };

  // Si es PDF en nuestro bucket, intentar borrar el archivo
  if (row.kind === "pdf" && row.url.includes("/module-pdfs/")) {
    const path = row.url.split("/module-pdfs/")[1];
    if (path) {
      await admin.storage.from("module-pdfs").remove([path]);
    }
  }

  const { error: delErr } = await admin
    .from("module_resources")
    .delete()
    .eq("id", resourceId);
  if (delErr) return { ok: false, error: delErr.message };

  revalidatePath("/admin/fases", "layout");
  return { ok: true };
}
