import type { SupabaseClient } from "@supabase/supabase-js";

type Args = {
  supabase: SupabaseClient;
  userId: string;
  moduleId: string;
  sectionId: string;
  courseWeek: number;
};

/**
 * Garantiza que exista una `assignment_submission` para (user, section)
 * de la semana en curso del alumno.
 *
 * Diseño:
 * 1. Verifica que `courseWeek === current_program_week(user_id)`. Si el
 *    alumno entra a una semana pasada o futura, NO crea nada.
 * 2. SELECT existing — si ya existe, no-op.
 * 3. Si no existe, pide `week_window(user, courseWeek)` a la DB y hace
 *    INSERT con `opens_at`/`closes_at` calculados en TZ DAP.
 *
 * Hay una mínima race condition entre el SELECT y el INSERT si dos
 * pestañas abren la activation al mismo tiempo — el peor caso son 2
 * filas duplicadas. Mitigación futura: agregar unique(user_id,
 * module_section_id) en assignment_submissions y usar ON CONFLICT.
 *
 * No throw: si falla silenciosamente loguea y sigue. El alumno verá la
 * UI normal; el cron de cierre la creará al siguiente tick si fuera
 * necesario. La página NO debe romper por esto.
 */
export async function ensureWeekAssignment({
  supabase,
  userId,
  moduleId,
  sectionId,
  courseWeek,
}: Args): Promise<void> {
  // 1. ¿Estamos en la semana de este módulo?
  const { data: cw } = await supabase.rpc("current_program_week", {
    p_user_id: userId,
  });
  if (cw !== courseWeek) return;

  // 2. ¿Ya existe?
  const { data: existing } = await supabase
    .from("assignment_submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("module_section_id", sectionId)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (existing) return;

  // 3. Pedir ventana semanal y crear el row
  const { data: win, error: winErr } = await supabase
    .rpc("week_window", {
      p_user_id: userId,
      p_course_week: courseWeek,
    })
    .single<{ opens_at: string; closes_at: string }>();
  if (winErr || !win) {
    console.error(
      `[ensureWeekAssignment] week_window falló user=${userId} week=${courseWeek}: ${winErr?.message ?? "no data"}`,
    );
    return;
  }

  const { error: insErr } = await supabase
    .from("assignment_submissions")
    .insert({
      user_id: userId,
      module_id: moduleId,
      module_section_id: sectionId,
      opens_at: win.opens_at,
      closes_at: win.closes_at,
      status: "open",
    });

  if (insErr) {
    // No relanzamos: si la inserción falló por race (otra request creó
    // la fila), simplemente seguimos.
    console.error(
      `[ensureWeekAssignment] INSERT falló user=${userId} section=${sectionId}: ${insErr.message}`,
    );
  }
}
