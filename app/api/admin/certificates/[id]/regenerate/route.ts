import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueCertificatePdf } from "@/lib/certificates/issue";
import { signedCertificateUrl } from "@/lib/certificates/upload";

export const runtime = "nodejs";

/**
 * POST /api/admin/certificates/[id]/regenerate
 *
 * Reemite el PDF para un certificado existente. Útil cuando:
 *   - La generación inicial falló (pdf_url es null).
 *   - Cambiamos el diseño y queremos refrescar PDFs.
 *   - Debug.
 *
 * Borra el path actual y limpia pdf_url para que issueCertificatePdf no
 * salga por el shortcut "skipped".
 *
 * Devuelve { path, signed_url } para verificación inmediata.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Solo admin" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  // Limpia pdf_url para forzar regeneración
  await admin
    .from("certificates")
    .update({ pdf_url: null })
    .eq("id", id);

  try {
    const { path } = await issueCertificatePdf(id);
    const signedUrl = await signedCertificateUrl(path);
    return NextResponse.json({ ok: true, path, signed_url: signedUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
