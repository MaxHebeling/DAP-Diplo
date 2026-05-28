import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { locales } from "@/i18n/config";

// Rutas que requieren login (cualquier rol). Si no hay sesión → /login.
// Se evalúan contra el pathname SIN el prefijo de locale (ver stripLocale).
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/comunidad",
  "/en-vivo",
  "/tutor",
  "/certificados",
  "/configuracion",
  "/progreso",
  "/certificaciones",
  "/agenda",
  "/admision",
];

/**
 * Quita el prefijo de locale (/en, /es) del pathname para poder evaluar las
 * rutas protegidas con la misma lógica en ambos idiomas. Devuelve el prefijo
 * (para reconstruir redirects con el idioma correcto) y el path sin prefijo.
 *
 * Ej: "/en/dashboard" → { prefix: "/en", path: "/dashboard" }
 *     "/dashboard"     → { prefix: "",    path: "/dashboard" }
 */
function stripLocale(pathname: string): { prefix: string; path: string } {
  for (const loc of locales) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const prefix = `/${loc}`;
      return { prefix, path: pathname.slice(prefix.length) || "/" };
    }
  }
  return { prefix: "", path: pathname };
}

/**
 * Decide si la ruta requiere `admission_status = 'approved'` además de
 * login. NO incluye /admision/* (sería loop) ni /admin/* (admin bypassa
 * por role). Sí incluye el player /fases/{slug}/modulos/* — pero NO
 * /fases/{slug} (página pública del bloque). Recibe el path SIN locale.
 */
function requiresAdmissionApproval(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/admision")) return false;

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname.startsWith("/comunidad")) return true;
  if (pathname.startsWith("/en-vivo")) return true;
  if (pathname.startsWith("/tutor")) return true;
  if (pathname.startsWith("/configuracion")) return true;
  if (pathname.startsWith("/progreso")) return true;
  if (pathname.startsWith("/certificaciones")) return true;
  if (pathname.startsWith("/agenda")) return true;
  // Player de módulos: /fases/{slug}/modulos/... — NO /fases/{slug}.
  if (/^\/fases\/[^/]+\/modulos\//.test(pathname)) return true;
  return false;
}

/**
 * Refresca la sesión de Supabase y aplica el gate de auth/admisión.
 *
 * Recibe `response` (normalmente el resultado del middleware de next-intl en
 * proxy.ts) para escribir las cookies de auth sobre ÉL y preservar lo que
 * i18n haya decidido (rewrite de locale, etc.). Los redirects preservan el
 * prefijo de locale para no perder el idioma.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() refresca la sesión. No mover esto ni meter lógica entre createServerClient y getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { prefix, path } = stripLocale(request.nextUrl.pathname);
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/login`;
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Admission gate: si la ruta requiere admisión aprobada, verificamos.
  if (user && requiresAdmissionApproval(path)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("admission_status, role")
      .eq("id", user.id)
      .maybeSingle<{ admission_status: string | null; role: string | null }>();

    const role = profile?.role ?? null;
    const status = profile?.admission_status ?? "none";

    // Admin bypassea el gate de admisión (admin no es alumno).
    if (role !== "admin" && status !== "approved") {
      const url = request.nextUrl.clone();
      url.pathname =
        status === "none" ? `${prefix}/admision` : `${prefix}/admision/estado`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
