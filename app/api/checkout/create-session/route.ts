import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Acepta tanto application/json como form-encoded (el botón de
  // /modulos/[slug] envía un <form> HTML para no necesitar JS).
  const contentType = request.headers.get("content-type") ?? "";
  let moduleId: string | null = null;
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    moduleId = typeof body.moduleId === "string" ? body.moduleId : null;
  } else {
    const form = await request.formData().catch(() => null);
    const raw = form?.get("moduleId");
    moduleId = typeof raw === "string" ? raw : null;
  }

  if (!moduleId) {
    return NextResponse.json({ error: "moduleId requerido" }, { status: 400 });
  }

  if (!user || !user.email) {
    // Sin sesión → mandar a login y volver
    const redirectTo = `/modulos`; // no conocemos el slug aún
    const url = new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Validar el módulo: publicado, con stripe_price_id, no inscrito ya.
  const { data: m, error: mErr } = await supabase
    .from("modules")
    .select("id, slug, stripe_price_id, published")
    .eq("id", moduleId)
    .eq("published", true)
    .maybeSingle();

  if (mErr || !m) {
    return NextResponse.json({ error: "Módulo no encontrado o no publicado" }, { status: 404 });
  }
  if (!m.stripe_price_id) {
    return NextResponse.json(
      { error: "Módulo sin stripe_price_id configurado" },
      { status: 422 },
    );
  }

  // Si ya está inscrito, mandar al módulo (no cobrar de nuevo).
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id, status, expires_at")
    .eq("user_id", user.id)
    .eq("module_id", m.id)
    .eq("status", "active")
    .maybeSingle();
  if (existing) {
    const url = new URL(`/modulos/${m.slug}`, request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  try {
    const session = await createCheckoutSession(
      { id: user.id, email: user.email },
      { id: m.id, slug: m.slug, stripe_price_id: m.stripe_price_id },
      appUrl,
    );
    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe no devolvió URL de checkout" },
        { status: 502 },
      );
    }
    // 303 = "See Other" — fuerza al navegador a hacer GET al redirect.
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando sesión";
    console.error("[stripe.create-session]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
