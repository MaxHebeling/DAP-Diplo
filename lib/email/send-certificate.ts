import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedCertificateUrl } from "@/lib/certificates/upload";

/**
 * Envía email de felicitación al alumno cuando completa una fase y se
 * emite su certificado. Idempotente vía certificates.email_sent_at: si
 * ya está populated, no reenvía.
 *
 * Política de error: igual que sendWelcomeEmail — fail soft, devuelve el
 * result y no throw. El caller (issueCertificatePdf) decide qué loggear.
 */
export async function sendCertificateEmail(
  certificateId: string,
): Promise<SendEmailResult> {
  const admin = createAdminClient();

  // Carga cert + relaciones en una sola query
  const { data: cert, error } = await admin
    .from("certificates")
    .select(
      `id, user_id, verification_code, pdf_url, email_sent_at, issued_at,
       user:profiles!certificates_user_id_fkey(full_name),
       phase:phases!certificates_phase_id_fkey(order_index, title),
       dimension:dimensions!certificates_dimension_id_fkey(name)`,
    )
    .eq("id", certificateId)
    .maybeSingle<{
      id: string;
      user_id: string;
      verification_code: string;
      pdf_url: string | null;
      email_sent_at: string | null;
      issued_at: string;
      user: { full_name: string } | null;
      phase: { order_index: number; title: string } | null;
      dimension: { name: string } | null;
    }>();
  if (error || !cert) {
    return {
      ok: false,
      error: `Certificado ${certificateId} no encontrado: ${error?.message ?? "missing"}`,
    };
  }

  // Idempotente
  if (cert.email_sent_at) {
    return {
      ok: true,
      id: `skipped-already-sent-${cert.email_sent_at}`,
    };
  }

  if (!cert.user || !cert.phase) {
    return {
      ok: false,
      error: `Certificado ${certificateId} incompleto (faltan user/phase).`,
    };
  }

  // Email del alumno
  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(cert.user_id);
  if (userErr || !userData.user?.email) {
    return {
      ok: false,
      error: `Email no encontrado para userId=${cert.user_id}: ${userErr?.message ?? "missing"}`,
    };
  }

  const firstName = cert.user.full_name?.split(" ")[0] ?? "Ministro";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";
  const blockN = String(cert.phase.order_index).padStart(2, "0");
  const verifyUrl = `${appUrl}/verificar/${cert.verification_code}`;

  // PDF signed URL (1h TTL — el email puede abrirse después del momento del envío)
  let pdfUrl: string | null = null;
  if (cert.pdf_url) {
    try {
      pdfUrl = await signedCertificateUrl(cert.pdf_url, 3600);
    } catch (err) {
      console.error(
        "[sendCertificateEmail] signed URL falló (se envía igual con solo verifyUrl):",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const html = renderCertificateHtml({
    firstName,
    phaseNumber: blockN,
    phaseTitle: cert.phase.title,
    dimensionName: cert.dimension?.name ?? null,
    verificationCode: cert.verification_code,
    verifyUrl,
    pdfUrl,
    appUrl,
  });

  const result = await sendEmail({
    to: userData.user.email,
    subject: cert.dimension
      ? `Completaste la Fase ${blockN} — eres ${cert.dimension.name}.`
      : `Completaste la Fase ${blockN} del DAP.`,
    html,
  });

  // Marca como enviado solo si Resend acepta
  if (result.ok) {
    const { error: updateErr } = await admin
      .from("certificates")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", cert.id);
    if (updateErr) {
      console.error(
        "[sendCertificateEmail] no se pudo marcar email_sent_at:",
        updateErr.message,
      );
      // No invalidamos el resultado — el email sí salió.
    }
  }

  return result;
}

// --- template HTML --------------------------------------------------

function renderCertificateHtml(opts: {
  firstName: string;
  phaseNumber: string;
  phaseTitle: string;
  dimensionName: string | null;
  verificationCode: string;
  verifyUrl: string;
  pdfUrl: string | null;
  appUrl: string;
}): string {
  const {
    firstName,
    phaseNumber,
    phaseTitle,
    dimensionName,
    verificationCode,
    verifyUrl,
    pdfUrl,
    appUrl,
  } = opts;

  const primaryHref = pdfUrl ?? verifyUrl;
  const primaryLabel = pdfUrl
    ? "Descargar mi certificado →"
    : "Ver verificación del certificado →";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>Completaste la Fase ${escapeHtml(phaseNumber)}</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;">

            <tr>
              <td align="center" style="padding:0 0 32px 0;">
                <div style="font-family:Georgia,'Playfair Display',serif;font-size:32px;font-weight:600;letter-spacing:-0.5px;color:#fafafa;">
                  DAP<span style="color:#fdad5a;">.</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 8px;">
                <p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#fdad5a;">
                  Fase completado · Certificado emitido
                </p>
                <h1 style="margin:0 0 24px;font-family:Georgia,'Playfair Display',serif;font-size:34px;line-height:1.15;font-weight:600;color:#fafafa;">
                  Felicidades, ${escapeHtml(firstName)}.
                </h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#d4d4d4;">
                  Acabas de completar el <strong style="color:#fafafa;">Fase ${escapeHtml(phaseNumber)} — ${escapeHtml(phaseTitle)}</strong>
                  ${
                    dimensionName
                      ? `y has alcanzado la dimensión ministerial de <strong style="color:#fdad5a;">${escapeHtml(dimensionName)}</strong>.`
                      : "del Diplomado Apostólico Pastoral."
                  }
                </p>
                <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#d4d4d4;">
                  Tu certificado ya está emitido y disponible para descarga.
                  El código de verificación es público — cualquiera puede
                  validarlo en línea.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 8px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
                      <a href="${primaryHref}" target="_blank"
                         style="display:inline-phase;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">
                        ${primaryLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 8px 36px;">
                <a href="${verifyUrl}" target="_blank"
                   style="font-size:13px;color:#a3a3a3;text-decoration:underline;">
                  Página pública de verificación
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 8px 0;border-top:1px solid #1f1f1f;">
                <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#737373;">
                  Código de verificación
                </p>
                <p style="margin:0 0 20px;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;letter-spacing:4px;color:#fafafa;">
                  ${escapeHtml(verificationCode)}
                </p>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#737373;">
                  Compártelo con quien quiera validar tu credencial. La
                  verificación es pública y muestra tu nombre, fase
                  completado, dimensión y fecha de emisión.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:24px 8px 0;">
                <p style="margin:0;font-size:11px;color:#525252;">
                  © 2026 DAP — Diplomado Apostólico Pastoral.<br>
                  <a href="${appUrl}" style="color:#737373;text-decoration:underline;">www.dapglobal.org</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
