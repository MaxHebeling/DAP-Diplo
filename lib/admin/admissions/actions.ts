"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateAdmissionLetter } from "@/lib/admission/generate-letter";
import { uploadAdmissionLetter } from "@/lib/admission/storage";
import { sendAdmissionLetterEmail } from "@/lib/email/send-admission-letter";
import { sendAdmissionRejectedEmail } from "@/lib/email/send-admission-rejected";
import {
  approveAdmissionSchema,
  rejectAdmissionSchema,
  resolveRejectionText,
} from "./schemas";

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Aprueba una admisión.
 *
 * Flujo:
 * 1. Auth: admin layout ya cubre /admin/* via redirect en layout.tsx,
 *    pero defense-in-depth verificamos rol acá.
 * 2. RPC `approve_admission(admission_id, reviewer)` — SECURITY DEFINER
 *    en la DB hace la transacción atómica (lock + matrícula +
 *    program_start_date + UPDATE admissions + profiles).
 * 3. NO enviamos email de aprobación inmediato: el alumno verá el
 *    estado actualizado al refrescar, y el cron 24h le mandará la
 *    carta PDF firmada por separado (UX intencional del plan v3.3).
 *
 * NOTA: no usamos admin client. El RPC verifica is_admin() y opera
 * como SECURITY DEFINER. Esto deja audit trail correcto (reviewed_by
 * es el admin real, no service-role).
 */
export async function approveAdmissionAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = approveAdmissionSchema.safeParse({
    admissionId: formData.get("admissionId"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { data, error } = await supabase
    .rpc("approve_admission", {
      p_admission_id: parsed.data.admissionId,
      p_reviewer: user.id,
    })
    .single<{
      matricula: string;
      program_start_date: string;
      user_id: string;
    }>();

  if (error) {
    return { ok: false, error: `No se pudo aprobar: ${error.message}` };
  }

  revalidatePath("/admin/admisiones");
  revalidatePath(`/admin/admisiones/${parsed.data.admissionId}`);
  return {
    ok: true,
    message: `Aprobado. Matrícula ${data?.matricula ?? "—"} · Inicia ${data?.program_start_date ?? "—"}. La carta PDF firmada se enviará al alumno en 24h.`,
  };
}

/**
 * Rechaza una admisión con motivo + envía email al aspirante.
 */
export async function rejectAdmissionAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const parsed = rejectAdmissionSchema.safeParse({
    admissionId: formData.get("admissionId"),
    reasonValue: formData.get("reasonValue"),
    customReason: formData.get("customReason") ?? undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Datos inválidos.",
    };
  }

  const reasonText = resolveRejectionText({
    reasonValue: parsed.data.reasonValue,
    customReason: parsed.data.customReason,
  });

  // RPC atómico: lock + UPDATE admissions + UPDATE profiles.
  const { data, error } = await supabase
    .rpc("reject_admission", {
      p_admission_id: parsed.data.admissionId,
      p_reviewer: user.id,
      p_reason: reasonText,
    })
    .single<{ user_id: string; reason: string }>();

  if (error) {
    return { ok: false, error: `No se pudo rechazar: ${error.message}` };
  }

  // Email al aspirante (best-effort; si falla, no revertimos el rechazo).
  if (data?.user_id) {
    const { data: admissionRow } = await supabase
      .from("admissions")
      .select("email, full_name")
      .eq("id", parsed.data.admissionId)
      .maybeSingle<{ email: string; full_name: string }>();

    if (admissionRow) {
      const emailRes = await sendAdmissionRejectedEmail({
        to: admissionRow.email,
        fullName: admissionRow.full_name,
        reason: reasonText,
      });
      if (!emailRes.ok) {
        console.error(
          `[admission] sendAdmissionRejectedEmail falló admission=${parsed.data.admissionId}: ${emailRes.error}`,
        );
      }
    }
  }

  revalidatePath("/admin/admisiones");
  revalidatePath(`/admin/admisiones/${parsed.data.admissionId}`);
  return { ok: true, message: "Rechazado y notificado." };
}

/**
 * Reenvía la carta de admisión manualmente desde el panel admin.
 *
 * Mismo flow exacto que app/api/cron/admission-letters/route.ts pero
 * disparado on-demand por un admin. Bypasea el delay de 24h. Idempotente
 * con el cron (actualiza admission_letter_sent_at; el cron no la vuelve
 * a procesar).
 *
 * Útil cuando:
 *   - Se aprueba ahora y el alumno necesita la carta antes que corra el
 *     cron diario.
 *   - El alumno reporta que no le llegó y querés reenviarla.
 *   - Cambiaste el template y querés regenerar/reenviar.
 */
export async function resendAdmissionLetterAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { data: profileMe } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profileMe?.role !== "admin") {
    return { ok: false, error: "No autorizado." };
  }

  const admissionId = formData.get("admissionId");
  if (typeof admissionId !== "string" || !admissionId) {
    return { ok: false, error: "Falta admissionId." };
  }

  const admin = createAdminClient();

  const { data: adm, error: admErr } = await admin
    .from("admissions")
    .select("id, user_id, email, full_name, status")
    .eq("id", admissionId)
    .maybeSingle<{
      id: string;
      user_id: string;
      email: string;
      full_name: string;
      status: string;
    }>();
  if (admErr) return { ok: false, error: `DB: ${admErr.message}` };
  if (!adm) return { ok: false, error: "Admisión no encontrada." };
  if (adm.status !== "approved") {
    return {
      ok: false,
      error: `La admisión está en estado "${adm.status}". Solo se puede reenviar carta de admisiones aprobadas.`,
    };
  }

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("matricula, program_start_date")
    .eq("id", adm.user_id)
    .maybeSingle<{ matricula: string; program_start_date: string }>();
  if (profErr) return { ok: false, error: `DB: ${profErr.message}` };
  if (!profile?.matricula || !profile.program_start_date) {
    return {
      ok: false,
      error: "Profile sin matrícula o fecha de inicio. La aprobación no se completó.",
    };
  }

  function parseDateOnly(iso: string): Date {
    const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }

  try {
    const pdfBuffer = await generateAdmissionLetter({
      fullName: adm.full_name,
      matricula: profile.matricula,
      programStartDate: parseDateOnly(profile.program_start_date),
      issuedDate: new Date(),
    });

    const { path } = await uploadAdmissionLetter({
      userId: adm.user_id,
      matricula: profile.matricula,
      pdfBuffer,
    });

    const emailRes = await sendAdmissionLetterEmail({
      to: adm.email,
      fullName: adm.full_name,
      matricula: profile.matricula,
      programStartDate: parseDateOnly(profile.program_start_date),
      pdfBuffer,
    });
    if (!emailRes.ok) {
      return { ok: false, error: `Email no se envió: ${emailRes.error}` };
    }

    const { error: updErr } = await admin
      .from("admissions")
      .update({
        admission_letter_url: path,
        admission_letter_sent_at: new Date().toISOString(),
      })
      .eq("id", adm.id);
    if (updErr) return { ok: false, error: `Update falló: ${updErr.message}` };

    revalidatePath("/admin/admisiones");
    revalidatePath(`/admin/admisiones/${admissionId}`);
    return {
      ok: true,
      message: `Carta reenviada a ${adm.email} (matrícula ${profile.matricula}).`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido.";
    console.error(`[resendAdmissionLetter] admission=${adm.id} failed: ${msg}`);
    return { ok: false, error: msg };
  }
}
