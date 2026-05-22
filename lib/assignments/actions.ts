"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type SubmitAssignmentResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const submitSchema = z.object({
  submissionId: z.string().uuid(),
  contentText: z
    .string()
    .min(20, "Tu entrega es muy corta. Escribí al menos 20 caracteres.")
    .max(20_000, "Tu entrega es demasiado larga (máx 20.000 caracteres)."),
});

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

  revalidatePath("/dashboard");
  // Revalidate del módulo player — el path tiene slugs dinámicos que no
  // tenemos acá. Usamos un revalidate prefix laxo.
  revalidatePath("/fases", "layout");

  return {
    ok: true,
    message: "¡Entrega recibida! Tu corrección estará en 48 horas.",
  };
}
