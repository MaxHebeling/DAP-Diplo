"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAssignmentToDirector } from "@/lib/email/send-assignment-to-director";

export type SubmitAssignmentResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const submitSchema = z.object({
  submissionId: z.string().uuid(),
  contentText: z
    .string()
    .min(20, "Tu entrega es muy corta. Escribí al menos 20 caracteres.")
    .max(20_000, "Tu entrega es demasiado larga (máx 20.000 caracteres)."),
  attachmentPath: z.string().max(500).optional().nullable(),
  attachmentName: z.string().max(200).optional().nullable(),
});

const ATTACHMENT_BUCKET = "assignment-attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
  "text/rtf",
  "application/rtf",
  "image/jpeg",
  "image/png",
]);

export type UploadAttachmentResult =
  | { ok: true; path: string; filename: string }
  | { ok: false; error: string };

/**
 * Sube un archivo adjunto (Word/PDF/imagen) para una assignment_submission
 * a Supabase Storage (bucket privado). Devuelve el path para que el caller
 * lo pase a submitAssignmentAction.
 *
 * Reglas:
 *  - Auth requerida; el path se prefijja por user_id (RLS-friendly).
 *  - MIME en allowlist (10 tipos permitidos).
 *  - Tamaño <= 10 MB.
 *  - Path: {userId}/{submissionId}-{timestamp}-{sanitizedFilename}
 */
export async function uploadAssignmentAttachmentAction(
  formData: FormData,
): Promise<UploadAttachmentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const file = formData.get("file");
  const submissionId = formData.get("submissionId");
  if (!(file instanceof File) || typeof submissionId !== "string") {
    return { ok: false, error: "Archivo o ID inválido." };
  }
  if (file.size === 0) return { ok: false, error: "Archivo vacío." };
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: `Archivo demasiado grande (máx 10 MB).` };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: `Formato no soportado. Aceptamos PDF, Word (.doc/.docx), texto, RTF, ODT y imágenes JPG/PNG.`,
    };
  }

  // Validar ownership de la submission
  const { data: sub } = await supabase
    .from("assignment_submissions")
    .select("id, user_id, status")
    .eq("id", submissionId)
    .maybeSingle<{ id: string; user_id: string; status: string }>();
  if (!sub || sub.user_id !== user.id) {
    return { ok: false, error: "Entrega no encontrada o no es tuya." };
  }
  if (sub.status !== "open") {
    return { ok: false, error: "Esta tarea ya fue enviada." };
  }

  // Sanitize filename
  const safe = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  const path = `${user.id}/${submissionId}-${Date.now()}-${safe}`;

  const admin = createAdminClient();
  const buf = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return { ok: false, error: `No se pudo subir el archivo: ${upErr.message}` };
  }

  return { ok: true, path, filename: file.name };
}

/**
 * El alumno entrega su tarea de la sección Activación.
 *
 * Reglas:
 *  - submission debe existir (creada por ensureWeekAssignment al entrar
 *    a la sección activation por primera vez en su semana).
 *  - status debe ser 'open' (no aceptamos re-entregas sobre completed /
 *    incomplete sin volver a abrir).
 *  - closes_at > now() (la ventana semanal sigue abierta).
 *  - El user_id de la submission debe coincidir con auth.uid().
 *
 * Al entregar:
 *  - content_text se persiste
 *  - status pasa a 'submitted'
 *  - submitted_at = now()
 *  El cron 48h después correrá la corrección IA y enviará el email con
 *  el feedback. El alumno NO ve el feedback inmediato (anti-ansiedad +
 *  espacio para asimilar).
 */
export async function submitAssignmentAction(
  formData: FormData,
): Promise<SubmitAssignmentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = submitSchema.safeParse({
    submissionId: formData.get("submissionId"),
    contentText: formData.get("contentText"),
    attachmentPath: formData.get("attachmentPath") || null,
    attachmentName: formData.get("attachmentName") || null,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  // Validar ownership + ventana abierta
  const { data: sub } = await supabase
    .from("assignment_submissions")
    .select("id, user_id, status, closes_at, module_id, module_section_id")
    .eq("id", parsed.data.submissionId)
    .maybeSingle<{
      id: string;
      user_id: string;
      status: string;
      closes_at: string;
      module_id: string;
      module_section_id: string;
    }>();

  if (!sub) return { ok: false, error: "Entrega no encontrada." };
  if (sub.user_id !== user.id) {
    return { ok: false, error: "Esta entrega no es tuya." };
  }
  if (sub.status !== "open") {
    return {
      ok: false,
      error:
        "Esta tarea ya fue enviada o cerrada. No puedes re-entregarla desde aquí.",
    };
  }
  if (new Date(sub.closes_at) <= new Date()) {
    return {
      ok: false,
      error: "La ventana de entrega ya cerró.",
    };
  }

  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("assignment_submissions")
    .update({
      content_text: parsed.data.contentText.trim(),
      attachment_url: parsed.data.attachmentPath ?? null,
      attachment_name: parsed.data.attachmentName ?? null,
      status: "submitted",
      submitted_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", sub.id)
    .eq("user_id", user.id) // defense-in-depth
    .eq("status", "open"); // evita race con otra tab

  if (updErr) {
    return { ok: false, error: `No se pudo enviar: ${updErr.message}` };
  }

  // Notificar al Director del DAP (fire-and-forget). Si el email falla,
  // el alumno NO se entera porque su entrega ya quedó guardada. Loggeamos
  // el error para revisión posterior.
  void notifyDirectorOfSubmission({
    submissionId: sub.id,
    moduleId: sub.module_id,
    userId: user.id,
    userEmail: user.email ?? "",
    contentText: parsed.data.contentText.trim(),
  }).catch((err) => {
    console.error(
      `[submitAssignmentAction] notify director failed for submission=${sub.id}:`,
      err,
    );
  });

  // Disparar IA correctora INSTANTÁNEAMENTE (fire-and-forget). El cron
  // sigue corriendo cada hora como red de seguridad. Esto hace que la
  // tarea aparezca corregida en /admin/correcciones en ~30-60s en vez
  // de hasta 1h.
  void (async () => {
    const cronSecret = process.env.CRON_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";
    if (!cronSecret) return;
    await fetch(`${appUrl}/api/admin/grade-now`, {
      method: "POST",
      headers: { authorization: `Bearer ${cronSecret}`, "content-type": "application/json" },
      body: JSON.stringify({ submissionId: sub.id }),
    });
  })().catch((err) => {
    console.error(`[submitAssignmentAction] grade-now failed for submission=${sub.id}:`, err);
  });

  revalidatePath("/dashboard");
  // Revalidate del módulo player — el path tiene slugs dinámicos que no
  // tenemos acá. Usamos un revalidate prefix laxo.
  revalidatePath("/fases", "layout");

  return {
    ok: true,
    message: "¡Entrega recibida! Tu corrección estará en 48 horas.",
  };
}

/**
 * Trae los datos necesarios para el email del director y dispara el
 * envío. Hace de orquestador para no inflar la action principal.
 */
async function notifyDirectorOfSubmission(opts: {
  submissionId: string;
  moduleId: string;
  userId: string;
  userEmail: string;
  contentText: string;
}): Promise<void> {
  const admin = createAdminClient();

  const [profileQ, moduleQ] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, matricula")
      .eq("id", opts.userId)
      .maybeSingle<{ full_name: string; matricula: string | null }>(),
    admin
      .from("modules")
      .select("title, course_week, slug, phase:phases(slug, title)")
      .eq("id", opts.moduleId)
      .maybeSingle<{
        title: string;
        course_week: number;
        slug: string;
        phase: { slug: string; title: string } | null;
      }>(),
  ]);

  const profile = profileQ.data;
  const mod = moduleQ.data;
  if (!profile || !mod) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";

  await sendAssignmentToDirector({
    studentName: profile.full_name,
    studentEmail: opts.userEmail,
    studentMatricula: profile.matricula,
    moduleTitle: mod.title,
    blockTitle: mod.phase?.title ?? "—",
    courseWeek: mod.course_week,
    contentText: opts.contentText,
    reviewUrl: `${appUrl}/admin/correcciones/${opts.submissionId}`,
  });
}
