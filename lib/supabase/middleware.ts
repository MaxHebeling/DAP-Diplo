import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren login (cualquier rol). Si no hay sesión → /login.
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

// Landings públicas estáticas — no requieren auth ni session refresh.
// Skipear el middleware Supabase entero permite a Next.js cachearlas
// agresivamente (CDN edge) y mejora SEO (TTFB sub-100ms).
const STATIC_PUBLIC_PATHS = new Set([
  "/",
  "/precios",
  "/como-funciona",
  "/contacto",
  "/privacidad",
  "/terminos",
  "/reembolso",
  "/demo",
  "/rangos",
  "/fases",
]);

/**
 * Decide si la ruta requiere `admission_status = 'approved'` además de
 * login. NO incluye /admision/* (sería loop) ni /admin/* (admin bypassa
 * por role). Sí incluye el player /fases/{slug}/modulos/* — pero NO
 * /fases/{slug} (página pública del bloque).
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

export async function updateSession(request: NextRequest) {
  const pathnameEarly = request.nextUrl.pathname;

  // Landings públicas estáticas: pasan sin tocar Supabase. Esto evita
  // que Next.js marque la page como dinámica por leer cookies, y permite
  // que el CDN de Vercel cachee la respuesta (s-maxage al edge).
  if (STATIC_PUBLIC_PATHS.has(pathnameEarly)) {
    const res = NextResponse.next({ request });
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=86400",
    );
    return res;
  }

  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() refresca la sesión. No mover esto ni meter lógica entre createServerClient y getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Admission gate: si la ruta requiere admisión aprobada, verificamos.
  // Un query extra a profiles solo en rutas gated; rutas públicas y
  // /admision/* lo evitan.
  if (user && requiresAdmissionApproval(pathname)) {
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
      url.pathname = status === "none" ? "/admision" : "/admision/estado";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
