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
  // 1. ¿El alumno tiene acceso a este módulo? course_week > currentWeek
  //    significa que el módulo es del futuro: no crear.
  //    course_week == currentWeek → semana actual.
  //    course_week < currentWeek → módulo pasado pero accesible
  //    (el alumno puede subir tarea retroactiva o ponerse al día).
  //    currentWeek === 0 → programa todavía no arrancó.
  const { data: cw } = await supabase.rpc("current_program_week", {
    p_user_id: userId,
  });
  const currentWeek = typeof cw === "number" ? cw : 0;
  if (currentWeek === 0 || courseWeek > currentWeek) return;

  // 2. ¿Ya existe?
  const { data: existing } = await supabase
    .from("assignment_submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("module_section_id", sectionId)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (existing) return;

  // 3. Determinar opens_at/closes_at:
  //    - Semana actual: pedir week_window al server (ventana semanal canónica)
  //    - Módulo pasado: ventana extendida (12 meses) para que el alumno pueda
  //      ponerse al día sin trabar el flujo.
  let opensAt: string;
  let closesAt: string;
  if (courseWeek === currentWeek) {
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
    opensAt = win.opens_at;
    closesAt = win.closes_at;
  } else {
    const now = new Date();
    opensAt = now.toISOString();
    closesAt = new Date(now.getTime() + 365 * 24 * 3600 * 1000).toISOString();
  }

  const { error: insErr } = await supabase
    .from("assignment_submissions")
    .insert({
      user_id: userId,
      module_id: moduleId,
      module_section_id: sectionId,
      opens_at: opensAt,
      closes_at: closesAt,
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
