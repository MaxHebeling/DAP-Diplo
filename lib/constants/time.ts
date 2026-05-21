/**
 * Constantes de tiempo para evitar magic numbers tipo `60 * 60 * 24`
 * regados por el código. Nombres explícitos = menos errores de "¿esto
 * eran segundos o ms?".
 */

// --- Segundos ---------------------------------------------------------
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE; // 3_600
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR; // 86_400
export const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;

// --- Milisegundos -----------------------------------------------------
export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
export const MS_PER_HOUR = SECONDS_PER_HOUR * MS_PER_SECOND;
export const MS_PER_DAY = SECONDS_PER_DAY * MS_PER_SECOND;
export const MS_PER_WEEK = SECONDS_PER_WEEK * MS_PER_SECOND;
