import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Callback handler de Supabase Auth.
 *
 * Recibe `?code=...&next=...` (flow PKCE). Intercambia el code por
 * sesión y redirige a `next` (default: /dashboard).
 *
 * Usos:
 *  - Reset de contraseña: el email envía a /auth/callback?code=...&next=/reset-password/update
 *  - Magic link: igual
 *  - OAuth (Google): igual. Para Google además consumimos cookies
 *    `dap_pending_country` y `dap_pending_country_code` seteadas por
 *    signInWithGoogleAction — así el país elegido en el onboarding modal
 *    sobrevive al roundtrip de OAuth y se persiste en profile.country.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next") ?? "/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL("/login?toast=auth-callback-no-code", url.origin));
  }

  const supabase = await createClient();
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeErr) {
    return NextResponse.redirect(
      new URL(`/login?toast=auth-callback-error`, url.origin),
    );
  }

  // Backfill país desde cookies temporales (solo si el profile quedó
  // con country=NULL, no pisamos lo que ya tenga).
  await backfillPendingCountry();

  return NextResponse.redirect(new URL(next, url.origin));
}

async function backfillPendingCountry(): Promise<void> {
  const jar = await cookies();
  const country = jar.get("dap_pending_country")?.value;
  const countryCode = jar.get("dap_pending_country_code")?.value;

  if (!country) return;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const admin = createAdminClient();
    // Solo actualizamos si está vacío — preservamos override manual del usuario.
    await admin
      .from("profiles")
      .update({ country })
      .eq("id", user.id)
      .is("country", null);

    // Enriquecemos también el user_metadata para futuras lecturas.
    if (countryCode) {
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...(user.user_metadata ?? {}),
          country,
          country_code: countryCode,
        },
      });
    }
  } catch (err) {
    // Log silencioso — el OAuth ya fue exitoso, no abortamos la sesión.
    console.error("[auth.callback] country backfill falló:", err);
  } finally {
    // Limpiamos las cookies aunque haya fallado el backfill (single-use).
    jar.delete("dap_pending_country");
    jar.delete("dap_pending_country_code");
  }
}

function sanitizeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}
