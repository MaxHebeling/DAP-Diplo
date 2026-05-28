import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./config";

/**
 * Configuración de i18n routing (Fase 2 — URLs /en para SEO).
 *
 * localePrefix "as-needed": el locale por defecto (es) NO lleva prefijo, así
 * que TODAS las URLs en español quedan idénticas (/precios, /dashboard, …).
 * El inglés vive bajo /en/… (/en/precios, /en/dashboard, …) e indexable por
 * separado.
 */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});
