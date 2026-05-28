import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18n = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas NO localizadas (route handlers + túnel Sentry): solo refresco de
  // sesión, sin pasar por i18n (no son páginas con [locale]).
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/monitoring")
  ) {
    return await updateSession(request, NextResponse.next({ request }));
  }

  // Páginas: primero i18n (detección/normalización de locale), luego sesión.
  const response = handleI18n(request);

  // Si i18n decidió redirigir (p.ej. normalizar el prefijo de locale),
  // respetamos ese redirect tal cual.
  if (response.headers.get("location")) {
    return response;
  }

  // Si no, Supabase escribe sus cookies sobre la respuesta de i18n y aplica
  // el gate de auth/admisión (preservando el prefijo de locale).
  return await updateSession(request, response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon.ico, sitemap.xml, robots.txt, manifest
     * - cualquier archivo con extensión (svg, png, jpg, ico, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
