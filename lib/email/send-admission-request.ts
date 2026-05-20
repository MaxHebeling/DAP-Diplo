import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

type AdmissionRequestEmailPayload = {
  fullName: string;
  email: string;
  birthDate: string;
  country: string;
  city: string;
  phone: string;
  churchName: string | null;
  ministryName: string | null;
  profession: string | null;
  companyOrSector: string | null;
  belongsToNetwork: boolean;
  networkName: string | null;
  consentLetterSignedUrl: string | null;
  submittedAt: Date;
};

/**
 * Notifica al equipo de admisiones cuando un aspirante envía su
 * solicitud. Va al inbox EMAIL_ADMISSIONS (admisiones@dapglobal.org)
 * con todos los datos + link signed URL a la carta de consentimiento
 * (24h de validez) si aplica.
 *
 * Política de error: log y return result (no throw). El server action
 * decide qué hacer.
 */
export async function sendAdmissionRequestEmail(
  payload: AdmissionRequestEmailPayload,
): Promise<SendEmailResult> {
  const to = process.env.EMAIL_ADMISSIONS;
  if (!to) {
    return {
      ok: false,
      error: "EMAIL_ADMISSIONS no está configurado.",
    };
  }

  const html = renderAdmissionRequestHtml(payload);

  return await sendEmail({
    to,
    subject: `Nueva admisión: ${payload.fullName} (${payload.country})`,
    html,
    replyTo: payload.email,
  });
}

function renderAdmissionRequestHtml(p: AdmissionRequestEmailPayload): string {
  const submitted = p.submittedAt.toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const networkLabel = !p.belongsToNetwork
    ? "<span style=\"color:#FF4D6D;\">No pertenece a la Red</span> · requiere validación de carta"
    : p.networkName === "reino_y_avivamiento"
      ? "Red Apostólica Reino y Avivamiento"
      : p.networkName === "revival_kingdom"
        ? "Revival &amp; Kingdom Ministries, INC"
        : "Pertenece a la Red (sin especificar)";

  const consentBlock = !p.belongsToNetwork
    ? p.consentLetterSignedUrl
      ? `<tr><td style="padding:16px 8px;background:rgba(123,97,255,0.08);border-radius:8px;border:1px solid rgba(123,97,255,0.25);">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;">Carta de consentimiento</p>
            <a href="${escapeHtml(p.consentLetterSignedUrl)}" target="_blank"
               style="display:inline-block;padding:10px 18px;background:#7B61FF;color:#fff;font-weight:600;text-decoration:none;border-radius:6px;font-size:14px;">
              Ver carta firmada por su pastor →
            </a>
            <p style="margin:8px 0 0;font-size:11px;color:#64748B;">Link válido por 24h.</p>
          </td></tr>`
      : `<tr><td style="padding:16px 8px;background:rgba(255,77,109,0.08);border-radius:8px;border:1px solid rgba(255,77,109,0.3);">
            <p style="margin:0;color:#FF4D6D;font-weight:600;">⚠️ Falta carta de consentimiento — revisar manualmente.</p>
          </td></tr>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nueva admisión: ${escapeHtml(p.fullName)}</title>
  </head>
  <body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
            <tr>
              <td style="padding:0 0 28px 0;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">
                  DAP · Admisión nueva
                </p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;color:#F8FAFC;">
                  ${escapeHtml(p.fullName)}
                </h1>
                <p style="margin:6px 0 0;font-size:13px;color:#94A3B8;">${escapeHtml(submitted)}</p>
              </td>
            </tr>

            <tr><td style="padding:16px 8px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;">Contacto</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#F8FAFC;">
                ${escapeHtml(p.email)}<br>
                ${escapeHtml(p.phone)}<br>
                ${escapeHtml(p.city)}, ${escapeHtml(p.country)}<br>
                Nacido: ${escapeHtml(p.birthDate)}
              </p>
            </td></tr>

            <tr><td style="padding:16px 8px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;">Pertenencia</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#F8FAFC;">
                <strong>Iglesia:</strong> ${escapeHtml(p.churchName ?? "—")}<br>
                <strong>Ministerio:</strong> ${escapeHtml(p.ministryName ?? "—")}<br>
                <strong>Profesión:</strong> ${escapeHtml(p.profession ?? "—")}<br>
                <strong>Empresa/sector:</strong> ${escapeHtml(p.companyOrSector ?? "—")}
              </p>
            </td></tr>

            <tr><td style="padding:16px 8px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;">Red apostólica</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#F8FAFC;">${networkLabel}</p>
            </td></tr>

            ${consentBlock}

            <tr><td style="padding:24px 8px 0;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#94A3B8;">
                Revisá en el panel admin: <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org")}/admin/admisiones" style="color:#FF4D6D;">/admin/admisiones</a>
              </p>
            </td></tr>

            <tr><td align="center" style="padding:24px 8px 0;">
              <p style="margin:0;font-size:11px;color:#64748B;">
                Respondé este email para escribirle directamente al aspirante.
              </p>
            </td></tr>
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
