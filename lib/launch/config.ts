/**
 * Gate de lanzamiento de inscripciones.
 *
 * Modelo: "00:01 del 01-Junio-2026 hora local del visitante".
 *
 * - Server: usa `ENROLLMENT_OPENS_AT` que está fijada a UTC+14 (la primera
 *   zona horaria del mundo en cruzar 01-Jun 00:01). Esto significa que el
 *   server permite registros desde el instante en que ALGÚN punto del
 *   mundo ya entró al 01-Jun 00:01 — necesario porque un visitante con
 *   reloj local en zona temprana no debería ver el server rechazándolo.
 *
 * - Cliente: usa `isEnrollmentOpenLocal()` que compara contra la hora
 *   LOCAL del browser. Así un visitante en Argentina (UTC-3) ve el sitio
 *   abierto recién cuando su reloj marca 01-Jun 00:01 ART (= UTC 03:01),
 *   no cuando un visitante en Samoa ya entró.
 *
 * Cuando llegue la fecha: NO hace falta tocar código.
 */

// Fecha objetivo (componentes calendario locales, evaluados por el browser).
const OPEN_YEAR = 2026;
const OPEN_MONTH = 5; // junio (0-indexed)
const OPEN_DAY = 1;
const OPEN_HOUR = 0;
const OPEN_MIN = 1;

// Server-side: instante en que la primera TZ del mundo (UTC+14) cruza
// 01-Jun-2026 00:01. UTC+14 es Kiribati/Samoa, la zona más temprana en
// cruzar el día.
export const ENROLLMENT_OPENS_AT = new Date("2026-05-31T10:01:00Z");

export const ENROLLMENT_OPENS_LABEL = "01 de Junio de 2026";

// Primer martes de clases — los módulos abren los martes 00:01 hora
// San Diego. El alumno tiene desde inscripción (01 Jun) hasta el 23
// Jun para completar admisión + pago antes de que arranque el ciclo.
export const CLASSES_START_AT = new Date("2026-06-23T00:01:00-07:00");

export const CLASSES_START_LABEL = "martes 23 de Junio de 2026";

/**
 * Server-side check. Usar en route handlers, server actions y server
 * components donde NO se puede consultar la hora local del visitante.
 *
 * Devuelve true desde el instante en que la primera TZ del mundo cruza
 * 01-Jun 00:01 (= 31-May 10:01 UTC).
 */
export function isEnrollmentOpen(now: Date = new Date()): boolean {
  return now.getTime() >= ENROLLMENT_OPENS_AT.getTime();
}

/**
 * Client-side check. Usar SOLO en componentes "use client" — depende del
 * reloj del browser del visitante.
 *
 * Devuelve true cuando el reloj LOCAL del browser ya cruzó
 * 01-Jun-2026 00:01.
 *
 * Implementación: `new Date(year, month, day, hour, min)` construye la
 * fecha en la TZ local del browser. Comparamos contra `Date.now()` que
 * también es local. Por eso es importante NO llamar esto en server: ahí
 * tomaría la TZ del runtime de Vercel (UTC) en vez de la del visitante.
 */
export function isEnrollmentOpenLocal(): boolean {
  const openLocal = new Date(
    OPEN_YEAR,
    OPEN_MONTH,
    OPEN_DAY,
    OPEN_HOUR,
    OPEN_MIN,
    0,
  ).getTime();
  return Date.now() >= openLocal;
}

/**
 * Devuelve los milisegundos restantes hasta la apertura LOCAL.
 * 0 si ya está abierta. Usado para countdown y para programar
 * la aparición del popup sin polling agresivo.
 */
export function msUntilLocalOpen(): number {
  const openLocal = new Date(
    OPEN_YEAR,
    OPEN_MONTH,
    OPEN_DAY,
    OPEN_HOUR,
    OPEN_MIN,
    0,
  ).getTime();
  return Math.max(0, openLocal - Date.now());
}
