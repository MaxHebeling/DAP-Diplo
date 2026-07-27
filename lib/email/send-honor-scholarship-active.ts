import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

/**
 * Notificación mensual "Beca de Honor vigente" para alumnos AR con beca activa.
 * Explícitamente NO menciona pagos ni deudas — es un mensaje pastoral de honra.
 */
export async function sendHonorScholarshipActiveEmail(p: {
  to: string;
  fullName: string;
  startDate: string;
  endDate: string | null;
}): Promise<SendEmailResult> {
  const firstName = p.fullName.trim().split(/\s+/)[0];
  const vigencia = p.endDate
    ? `Vigente desde ${fmtDate(p.startDate)} hasta ${fmtDate(p.endDate)}.`
    : `Vigente desde ${fmtDate(p.startDate)}.`;
  const html = render({ ...p, firstName, vigencia });
  return await sendEmail({
    to: p.to,
    subject: `${firstName}, tu Beca de Honor DAP continúa vigente`,
    html,
    replyTo: process.env.EMAIL_ADMISSIONS,
  });
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]} de ${y}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function render(p: { firstName: string; fullName: string; vigencia: string }): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
  <tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#F59E0B;">DAP · Beca de Honor</p>
        <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;color:#F8FAFC;">${escapeHtml(p.firstName)}, tu Beca de Honor continúa vigente</h1>
      </td></tr>
      <tr><td style="padding:0 0 16px;font-size:16px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0 0 16px;">Hola <strong>${escapeHtml(p.firstName)}</strong>,</p>
        <p style="margin:0 0 16px;">Te confirmamos que tu <strong>Beca de Honor</strong> en el Diplomado Apostólico Pastoral continúa activa.</p>
      </td></tr>
      <tr><td style="padding:0 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.30);border-radius:10px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 6px;font-size:11px;color:#F59E0B;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Estado</p>
            <p style="margin:0;font-size:22px;font-weight:700;color:#F59E0B;">Beca de Honor vigente</p>
            <p style="margin:12px 0 0;font-size:14px;color:#E2E8F0;">${escapeHtml(p.vigencia)}</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 0 24px;font-size:15px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0 0 16px;"><strong>Este mensaje no es una solicitud de pago.</strong> Mientras tu Beca de Honor se encuentre vigente, estás completamente liberado del pago de mensualidades.</p>
        <p style="margin:0 0 16px;">Te recordamos la importancia de mantenerte activo, completar tus clases, tareas, evaluaciones y demás requisitos académicos del programa.</p>
        <p style="margin:0;">Agradecemos tu compromiso, responsabilidad y dedicación.</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 0 32px;">
        <a href="https://www.dapglobal.org/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;">Ir a mi portal →</a>
      </td></tr>
      <tr><td style="padding:24px 0 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0;color:#F8FAFC;font-weight:600;">Sigamos levantando líderes juntos.</p>
        <p style="margin:8px 0 0;color:#F8FAFC;font-weight:600;">En honor,<br>Apóstol Max Hebeling</p>
        <p style="margin:8px 0 0;font-size:12px;color:#94A3B8;">DAP · Diplomado Apostólico Pastoral</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}
