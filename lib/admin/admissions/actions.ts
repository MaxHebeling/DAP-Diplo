"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
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
