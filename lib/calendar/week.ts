/**
 * Helpers de calendario semanal del DAP.
 *
 * La fuente de verdad del cálculo de semanas es la DB
 * (current_program_week, week_window). Acá hay helpers TS para:
 *   - Formatear fechas de la ventana semanal en TZ DAP.
 *   - Calcular cuántos días faltan hasta el cierre del lunes.
 *   - Mapear course_week → bloque (1..9) e índice dentro del bloque (1..8).
 *
 * NUNCA calcules la semana actual en TS leyendo new Date() — el server
 * Postgres y el cliente pueden discrepar por TZ del browser. Siempre
 * pasá por la RPC.
 */

export const DAP_TZ = "America/Mexico_City";

/**
 * Formatea una fecha en TZ DAP en formato largo español
 * (e.g. "martes, 19 de mayo de 2026").
 */
export function formatDapLongDate(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DAP_TZ,
  });
}

/**
 * Formatea fecha + hora en TZ DAP (e.g. "19 may 2026, 00:01").
 */
export function formatDapDateTime(d: Date): string {
  return d.toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DAP_TZ,
  });
}

/**
 * Días enteros restantes hasta `target` desde ahora, en TZ DAP.
 * Si ya pasó, devuelve 0.
 */
export function daysUntil(target: Date): number {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Devuelve { phase, indexInPhase } a partir de course_week 1..72.
 * Bloque 1 = semanas 1–8, bloque 2 = 9–16, etc.
 */
export function weekToPhase(courseWeek: number): {
  phase: number;
  indexInPhase: number;
} {
  if (courseWeek < 1 || courseWeek > 72) {
    throw new Error(`course_week fuera de rango: ${courseWeek}`);
  }
  const phase = Math.ceil(courseWeek / 8);
  const indexInPhase = ((courseWeek - 1) % 8) + 1;
  return { phase, indexInPhase };
}

/**
 * Status visual de un módulo según la semana actual del alumno.
 * - "open" = es el módulo de esta semana (tarea activa).
 * - "review" = de semanas pasadas (contenido sigue disponible, tarea cerrada).
 * - "locked" = de semanas futuras.
 */
export type WeekStatus = "open" | "review" | "locked";

export function weekStatus(
  moduleWeek: number,
  currentWeek: number,
): WeekStatus {
  if (moduleWeek === currentWeek) return "open";
  if (moduleWeek < currentWeek) return "review";
  return "locked";
}

/**
 * Calcula la fecha estimada de apertura de una semana futura (en TZ
 * DAP) sin llamar a la DB. Útil para mostrar "abre el martes X" en el
 * dashboard sin hacer 70+ queries.
 *
 * Acepta program_start_date como string 'YYYY-MM-DD' (la columna date
 * de Postgres llega así al cliente). Devuelve null si el input está
 * mal formado.
 */
export function estimateWeekOpensAt(
  programStartDateIso: string | null,
  courseWeek: number,
): Date | null {
  if (!programStartDateIso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(programStartDateIso);
  if (!match) return null;
  const [, y, m, d] = match;
  // Construimos la fecha como local (sin TZ) y luego sumamos semanas.
  // Para formateo no necesitamos UTC exacto: el toLocaleDateString con
  // timeZone DAP resuelve la diferencia de presentación.
  const base = new Date(Number(y), Number(m) - 1, Number(d));
  base.setDate(base.getDate() + (courseWeek - 1) * 7);
  return base;
}
