"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Asigna un pastor responsable a un alumno o matrimonio.
 * Si ya tiene uno activo, lo cierra (status='ended', active_until=hoy) y
 * crea una nueva asignación activa. Historial preservado.
 */
export async function assignPastorAction(input: {
  targetKind: "student" | "pair";
  targetId: string; // user_id del alumno, o spousal_pair_id
  pastorUserId: string;
  observations?: string;
}): Promise<Result> {
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { ok: false, error: "Solo admin" };
  if (!input.pastorUserId) return { ok: false, error: "pastorUserId requerido" };

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  // 1. Verificar que el pastorUserId realmente es role='pastor'
  const { data: pastor } = await admin.from("profiles").select("id, role")
    .eq("id", input.pastorUserId).maybeSingle<{ id: string; role: string }>();
  if (!pastor || pastor.role !== "pastor") return { ok: false, error: "El usuario no tiene rol de pastor" };

  // 2. Cerrar asignación activa previa (si existe)
  const target = input.targetKind === "student"
    ? { student_user_id: input.targetId }
    : { spousal_pair_id: input.targetId };
  const targetCol = input.targetKind === "student" ? "student_user_id" : "spousal_pair_id";

  await admin.from("pastor_assignments").update({
    status: "ended", active_until: today, updated_at: nowIso,
  })
    .eq(targetCol, input.targetId)
    .eq("status", "active");

  // 3. Crear nueva asignación
  const { error } = await admin.from("pastor_assignments").insert({
    ...target,
    pastor_user_id: input.pastorUserId,
    status: "active",
    active_from: today,
    assigned_by: userId,
    observations: input.observations ?? null,
  });
  if (error) return { ok: false, error: error.message };

  // 4. Cache: si es individual, también actualizamos profiles.responsible_pastor_user_id
  if (input.targetKind === "student") {
    await admin.from("profiles")
      .update({ responsible_pastor_user_id: input.pastorUserId, updated_at: nowIso })
      .eq("id", input.targetId);
  } else {
    // Matrimonio: cachear en ambos cónyuges
    const { data: pair } = await admin.from("spousal_pairs")
      .select("spouse_1_user_id, spouse_2_user_id").eq("id", input.targetId).single();
    if (pair) {
      await admin.from("profiles")
        .update({ responsible_pastor_user_id: input.pastorUserId, updated_at: nowIso })
        .in("id", [pair.spouse_1_user_id, pair.spouse_2_user_id]);
      await admin.from("spousal_pairs")
        .update({ responsible_pastor_user_id: input.pastorUserId, updated_at: nowIso })
        .eq("id", input.targetId);
    }
  }

  revalidatePath("/admin/pagos-ar");
  revalidatePath("/pastor");
  return { ok: true };
}
