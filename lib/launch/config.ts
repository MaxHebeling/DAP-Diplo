/**
 * Gate de lanzamiento de inscripciones.
 *
 * Hasta esta fecha, todo CTA público de "Inscribirme / Suscribirme /
 * Empezar" abre un popup en vez de navegar al flow real. La página
 * /signup también bloquea con un mensaje "Próximamente".
 *
 * Cuando llegue la fecha: NO hace falta tocar código — la condición
 * `isEnrollmentOpen()` se evalúa en cada render y los CTAs vuelven a
 * funcionar solos.
 */

// 01 de Junio 2026 — 00:01 hora San Diego (America/Los_Angeles, UTC-7 en junio).
export const ENROLLMENT_OPENS_AT = new Date("2026-06-01T00:01:00-07:00");

export const ENROLLMENT_OPENS_LABEL = "01 de Junio de 2026";

// Primer martes de clases — los módulos abren los martes 00:01 hora
// San Diego. El alumno tiene desde inscripción (01 Jun) hasta el 23
// Jun para completar admisión + pago antes de que arranque el ciclo.
export const CLASSES_START_AT = new Date("2026-06-23T00:01:00-07:00");

export const CLASSES_START_LABEL = "martes 23 de Junio de 2026";

export function isEnrollmentOpen(now: Date = new Date()): boolean {
  return now.getTime() >= ENROLLMENT_OPENS_AT.getTime();
}
