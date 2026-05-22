/**
 * Datos y helpers específicos de Argentina para el flujo de
 * inscripción especial de matrimonios.
 *
 * Las 23 provincias + CABA (Ciudad Autónoma de Buenos Aires).
 * Lista oficial INDEC, alfabética con CABA primero por uso.
 */

export const AR_PROVINCES: readonly string[] = [
  "Ciudad Autónoma de Buenos Aires",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

export const AR_DIAL_CODE = "+54";

/**
 * Valida que un teléfono empiece con +54 y tenga al menos 8 dígitos
 * adicionales (formato laxo: AR tiene números entre 10 y 13 dígitos
 * incluyendo área). No bloqueamos por formato exacto — solo prefijo
 * y longitud razonable. Acepta espacios y guiones.
 */
export function isArgentinePhone(raw: string): boolean {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (!cleaned.startsWith("+54")) return false;
  const digits = cleaned.slice(3);
  return /^\d{8,13}$/.test(digits);
}

export function isValidArProvince(value: string): boolean {
  return AR_PROVINCES.includes(value);
}

/**
 * Precio del matrimonio Argentina, en centavos USD para Stripe.
 * Una sola suscripción de USD $35/mes cubre a ambos cónyuges.
 */
export const AR_MARRIAGE_PRICE_USD_CENTS = 3500;
export const AR_MARRIAGE_PRICE_USD_DISPLAY = "USD $35";
