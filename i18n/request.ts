import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Carga y fusiona los mensajes del locale activo.
 *
 * - messages/<locale>.json          → núcleo (Header, LanguageSwitcher, Common).
 * - messages/zones/*.<locale>.json  → un archivo por zona, cada uno con su
 *   propio namespace de nivel superior (Landing, PublicPages, Footer, …).
 *   Se fusionan con Object.assign; al ser namespaces distintos, no colisionan.
 *
 * Al migrar una zona nueva, añade aquí su import (es la única edición que
 * requiere este archivo central — el resto vive en messages/zones/).
 */
async function loadMessages(locale: Locale) {
  const [
    core,
    landing,
    publicPages,
    layoutMisc,
    auth,
    student,
    studentFeatures,
    community,
    adminPages,
    adminUi,
    miscPages,
    onboardingDemo,
    uiShared,
    gaps,
  ] = await Promise.all([
    import(`../messages/${locale}.json`),
    import(`../messages/zones/landing.${locale}.json`),
    import(`../messages/zones/public-pages.${locale}.json`),
    import(`../messages/zones/layout-misc.${locale}.json`),
    import(`../messages/zones/auth.${locale}.json`),
    import(`../messages/zones/student.${locale}.json`),
    import(`../messages/zones/student-features.${locale}.json`),
    import(`../messages/zones/community.${locale}.json`),
    import(`../messages/zones/admin-pages.${locale}.json`),
    import(`../messages/zones/admin-ui.${locale}.json`),
    import(`../messages/zones/misc-pages.${locale}.json`),
    import(`../messages/zones/onboarding-demo.${locale}.json`),
    import(`../messages/zones/ui-shared.${locale}.json`),
    import(`../messages/zones/gaps.${locale}.json`),
  ]);

  return Object.assign(
    {},
    core.default,
    landing.default,
    publicPages.default,
    layoutMisc.default,
    auth.default,
    student.default,
    studentFeatures.default,
    community.default,
    adminPages.default,
    adminUi.default,
    miscPages.default,
    onboardingDemo.default,
    uiShared.default,
    gaps.default,
  );
}

/**
 * Resuelve el locale por request (cookie NEXT_LOCALE, sin i18n routing) y
 * entrega los mensajes fusionados. Leer la cookie hace que las páginas se
 * rendericen de forma dinámica; aceptable para esta app.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
