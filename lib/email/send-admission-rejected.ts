import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

type AdmissionRejectedEmailInput = {
  to: string;
  fullName: string;
  reason: string;
};

/**
 * Notifica al aspirante que su admisión fue rechazada. Tono respetuoso,
 * deja la puerta abierta a contacto con admisiones para entender
 * próximos pasos.
 */
export async function sendAdmissionRejectedEmail(
  input: AdmissionRejectedEmailInput,
): Promise<SendEmailResult> {
  const firstName = input.fullName.split(" ")[0];

  return await sendEmail({
    to: input.to,
    subject: "Actualización sobre tu solicitud de admisión al DAP",
    html: renderHtml({ firstName, reason: input.reason }),
    replyTo: process.env.EMAIL_ADMISSIONS ?? undefined,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(p: { firstName: string; reason: string }): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Actualización sobre tu admisión</title>
  </head>
  <body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="padding:0 0 28px 0;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">
                  DAP · Admisión
                </p>
                <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;color:#F8FAFC;">
                  Hola, ${escapeHtml(p.firstName)}.
                </h1>
              </td>
            </tr>

            <tr><td>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#E2E8F0;">
                Gracias por el tiempo invertido en tu solicitud. Después de
                revisar tu admisión al Diplomado Apostólico Pastoral, no podemos
                aprobarla en esta convocatoria.
              </p>
            </td></tr>

            <tr><td style="padding:16px 8px;background:rgba(255,77,109,0.08);border-radius:10px;border:1px solid rgba(255,77,109,0.25);">
              <p style="margin:0 0 6px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;">Motivo</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#F8FAFC;">
                ${escapeHtml(p.reason)}
              </p>
            </td></tr>

            <tr><td style="padding:24px 0 0;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#CBD5E1;">
                Si quieres contarnos más contexto o ajustar lo que sea necesario,
                responde este email o escríbenos a
                <a href="mailto:admisiones@dapglobal.org" style="color:#FF4D6D;">admisiones@dapglobal.org</a>.
                Estaremos atentos.
              </p>
            </td></tr>

            <tr><td align="center" style="padding:32px 0 0;">
              <p style="margin:0;font-size:11px;color:#64748B;letter-spacing:1px;text-transform:uppercase;">
                DAP — Diplomado Apostólico Pastoral
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
