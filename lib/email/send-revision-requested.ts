import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

type Payload = {
  to: string;
  studentName: string;
  moduleTitle: string;
  revisionNote: string;
  portalUrl: string;
};

export async function sendRevisionRequestedEmail(p: Payload): Promise<SendEmailResult> {
  const firstName = p.studentName.trim().split(/\s+/)[0];
  const html = render({ ...p, firstName });
  return await sendEmail({
    to: p.to,
    subject: `Tu tarea de "${p.moduleTitle}" necesita una revisión`,
    html,
    replyTo: process.env.EMAIL_ADMISSIONS,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function render(p: Payload & { firstName: string }): string {
  const note = escapeHtml(p.revisionNote).replace(/\n/g, "<br>");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
  <tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">DAP · Revisión de tarea</p>
        <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;color:#F8FAFC;">Tu tarea necesita una revisión.</h1>
      </td></tr>
      <tr><td style="padding:0 0 16px;font-size:16px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0 0 16px;">Hola <strong>${escapeHtml(p.firstName)}</strong>,</p>
        <p style="margin:0 0 16px;">Revisé tu entrega de <strong>${escapeHtml(p.moduleTitle)}</strong> y quiero pedirte que la profundices antes de aprobarla.</p>
        <p style="margin:0 0 8px;font-weight:600;color:#F8FAFC;">Mi feedback:</p>
      </td></tr>
      <tr><td style="padding:0 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,77,109,0.08);border:1px solid rgba(255,77,109,0.25);border-radius:8px;">
          <tr><td style="padding:18px 22px;font-size:15px;line-height:1.7;color:#F8FAFC;">${note}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 0 24px;font-size:15px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0;">Entrá a tu portal, abrí la sección Activación, editá tu respuesta y volvé a enviarla. No hace falta empezar de cero — tu texto anterior está cargado.</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 0 32px;">
        <a href="${escapeHtml(p.portalUrl)}" style="display:inline-block;padding:14px 32px;background:#FF4D6D;color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;">Editar mi tarea →</a>
      </td></tr>
      <tr><td style="padding:24px 0 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0;color:#F8FAFC;font-weight:600;">En honor,<br>Apóstol Max Hebeling</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}
