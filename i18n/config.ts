/**
 * Configuración central de internacionalización (i18n).
 *
 * Modo: "sin i18n routing" (locale por cookie, no por URL). El idioma se
 * guarda en la cookie NEXT_LOCALE y la interfaz se traduce con next-intl.
 * NO hay segmento [locale] en las rutas → las URLs en español NO cambian
 * y el gate de autenticación de Supabase (lib/supabase/middleware.ts) no
 * se toca.
 *
 * Fase 2 (futura): añadir URLs /en para SEO de la landing pública.
 */
export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

/** Nombre de la cookie donde se guarda el idioma elegido por el usuario. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Etiquetas legibles para el selector de idioma. */
export const localeLabels: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
