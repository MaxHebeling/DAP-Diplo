import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBillingPortalSession } from "@/lib/stripe/api";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal
 * Inicia una Stripe Customer Portal session para el usuario actual.
 * Acepta tanto form-encoded (botón submit desde dashboard) como JSON.
 * Redirige al portal con 303.
 *
 * Requiere:
 * - Sesión iniciada (sino 401/redirect a login)
 * - profile.stripe_customer_id seteado (sino 404 — no ha hecho ni un
 *   checkout, por lo tanto no hay nada que gestionar)
 *
 * El portal sirve incluso si la suscripción está cancelada (útil
 * para ver historial de facturas).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL("/login?redirectTo=/dashboard", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr || !profile) {
    return NextResponse.json(
      { error: "Perfil no encontrado." },
      { status: 404 },
    );
  }
  if (!profile.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "No tienes una suscripción activa o pasada. Suscríbete primero para acceder al portal.",
      },
      { status: 404 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    const session = await createBillingPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${appUrl}/dashboard`,
    });
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error abriendo portal";
    console.error("[billing.portal] createBillingPortalSession FAILED:", msg);
    // Si el Customer Portal no está configurado en Stripe dashboard,
    // el error de Stripe lo dice explícitamente.
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
