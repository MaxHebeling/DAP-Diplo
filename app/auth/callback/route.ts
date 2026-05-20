import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback handler de Supabase Auth.
 *
 * Recibe `?code=...&next=...` (flow PKCE). Intercambia el code por
 * sesión y redirige a `next` (default: /dashboard).
 *
 * Usos:
 *  - Reset de contraseña: el email envía a /auth/callback?code=...&next=/reset-password/update
 *  - Magic link (futuro): igual
 *  - OAuth (futuro): igual
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next") ?? "/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL("/login?toast=auth-callback-no-code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?toast=auth-callback-error`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

function sanitizeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
