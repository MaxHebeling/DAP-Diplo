import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
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

  const { admin: isAdmin, userId } = await requireAdmin();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
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
