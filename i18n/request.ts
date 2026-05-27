import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Resuelve el locale por request y carga los mensajes correspondientes.
 *
 * Estrategia (sin i18n routing): el idioma viene de la cookie NEXT_LOCALE.
 * Si no hay cookie o es inválida, cae al defaultLocale ("es"). Leer la
 * cookie hace que las páginas se rendericen de forma dinámica; aceptable
 * para esta app (la mayoría ya es dinámica tras login).
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
