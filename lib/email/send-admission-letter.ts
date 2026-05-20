import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

type AdmissionLetterEmailInput = {
  to: string;
  fullName: string;
  matricula: string;
  programStartDate: Date;
  pdfBuffer: Buffer;
};

/**
 * Envía al alumno la carta PDF firmada de admisión. Lo dispara el cron
 * 24h después de la aprobación. El email es bilingüe-friendly pero el
 * cuerpo principal va en español (el producto es ES-only).
 *
 * Política de error: NO throw. Devuelve result; el caller (cron) decide
 * si vuelve a intentar en la próxima corrida (idempotente vía
 * admission_letter_sent_at).
 */
export async function sendAdmissionLetterEmail(
  input: AdmissionLetterEmailInput,
): Promise<SendEmailResult> {
  const { to, fullName, matricula, programStartDate, pdfBuffer } = input;

  const firstName = fullName.split(" ")[0];
  const startStr = formatLongDate(programStartDate);
  const filename = `carta-admision-${matricula.toLowerCase()}.pdf`;

  return await sendEmail({
    to,
    subject: `Tu carta de admisión al DAP — ${matricula}`,
    html: renderHtml({ firstName, matricula, startStr }),
    attachments: [
      {
        filename,
        content: pdfBuffer.toString("base64"),
        contentType: "application/pdf",
      },
    ],
  });
}

function formatLongDate(d: Date): string {
  return d
    .toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(p: {
  firstName: string;
  matricula: string;
  startStr: string;
}): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu carta de admisión al DAP</title>
  </head>
  <body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="padding:0 0 28px 0;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">
                  DAP · Admisión confirmada
                </p>
                <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:700;color:#F8FAFC;">
                  Bienvenido, ${escapeHtml(p.firstName)}.
                </h1>
              </td>
            </tr>

            <tr><td style="padding:0 0 16px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#E2E8F0;">
                Es un honor recibirte. Adjunto a este correo encontrarás tu
                <strong>carta de admisión oficial</strong>, firmada por el Dr. Max Hebeling.
              </p>
            </td></tr>

            <tr><td style="padding:16px 8px;background:rgba(123,97,255,0.08);border-radius:10px;border:1px solid rgba(123,97,255,0.25);margin-bottom:16px;">
              <p style="margin:0 0 10px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94A3B8;">Datos de tu admisión</p>
              <p style="margin:0 0 6px;font-size:14px;color:#F8FAFC;">
                <strong>Matrícula:</strong> ${escapeHtml(p.matricula)}
              </p>
              <p style="margin:0;font-size:14px;color:#F8FAFC;">
                <strong>Inicio de tu programa:</strong> ${escapeHtml(p.startStr)}
              </p>
            </td></tr>

            <tr><td style="padding:24px 0 0;">
              <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#CBD5E1;">
                A partir de tu fecha de inicio, recibirás un módulo nuevo cada semana
                (martes 00:01 — lunes 23:59). El contenido pasado siempre queda
                disponible para repaso.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#CBD5E1;">
                Si tenés cualquier consulta, respondé este email o escribinos a
                <a href="mailto:admisiones@dapglobal.org" style="color:#FF4D6D;">admisiones@dapglobal.org</a>.
              </p>
            </td></tr>

            <tr><td align="center" style="padding:36px 0 0;">
              <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org")}/dashboard"
                 style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);color:#fff;font-weight:600;text-decoration:none;border-radius:8px;font-size:14px;">
                Entrar al dashboard →
              </a>
            </td></tr>

            <tr><td align="center" style="padding:32px 0 0;">
              <p style="margin:0;font-size:11px;color:#64748B;letter-spacing:1px;text-transform:uppercase;">
                DAP — Diplomado Apostólico Pastoral
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#64748B;">
                Red Apostólica Reino y Avivamiento · Revival &amp; Kingdom Ministries, INC
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
