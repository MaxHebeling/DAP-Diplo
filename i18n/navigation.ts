import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Navegación consciente del locale. USAR ESTOS en vez de los de next/link y
 * next/navigation en todo el código de UI:
 *
 *   import { Link, redirect, usePathname, useRouter } from "@/i18n/navigation";
 *
 * Con localePrefix "as-needed", estos helpers preservan el idioma activo al
 * navegar: si el usuario está en /en/..., un <Link href="/precios"> lo lleva
 * a /en/precios (no se "cae" al español). En español el prefijo se omite.
 *
 * Las rutas que se pasan a href/redirect son SIEMPRE las base en español
 * (ej. "/precios", "/dashboard"); next-intl agrega el prefijo /en solo.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
