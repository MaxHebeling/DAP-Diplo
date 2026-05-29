import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

const DIRECTOR_EMAIL = "drhebeling@dapglobal.org";

/**
 * Notifica al Director del DAP cuando un alumno sube su tarea de la
 * semana. Se manda DESDE el sistema y `replyTo` queda apuntando al email
 * del alumno, así el Director puede responder directo sin cambiar de
 * pantalla.
 *
 * Fire-and-forget desde submitAssignmentAction: si Resend falla, el
 * submit del alumno NO falla. El error se loggea para revisar después.
 */
export async function sendAssignmentToDirector(opts: {
  studentName: string;
  studentEmail: string;
  studentMatricula: string | null;
  moduleTitle: string;
  blockTitle: string;
  courseWeek: number;
  contentText: string;
  reviewUrl: string;
}): Promise<SendEmailResult> {
  const subject = `Tarea S${opts.courseWeek} · ${opts.studentName} · ${opts.moduleTitle}`;
  const html = renderHtml(opts);

  return await sendEmail({
    to: DIRECTOR_EMAIL,
    replyTo: opts.studentEmail,
    subject,
    html,
  });
}

function renderHtml(opts: {
  studentName: string;
  studentEmail: string;
  studentMatricula: string | null;
  moduleTitle: string;
  blockTitle: string;
  courseWeek: number;
  contentText: string;
  reviewUrl: string;
}): string {
  const escaped = {
    name: escapeHtml(opts.studentName),
    email: escapeHtml(opts.studentEmail),
    matricula: opts.studentMatricula ? escapeHtml(opts.studentMatricula) : "—",
    moduleTitle: escapeHtml(opts.moduleTitle),
    blockTitle: escapeHtml(opts.blockTitle),
    content: escapeHtml(opts.contentText).replace(/\n/g, "<br>"),
    reviewUrl: opts.reviewUrl,
  };

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nueva tarea entregada</title></head>
<body style="margin:0;padding:0;background:#04081A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#04081A;"><tr><td align="center" style="padding:36px 20px 24px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
  <tr><td style="padding:0 0 28px 0;">
    <div style="font-family:'Space Grotesk',-apple-system,Helvetica,sans-serif;font-size:32px;font-weight:700;letter-spacing:-1px;background:linear-gradient(135deg,#F8FAFC 0%,#A28BFF 60%,#FF4D6D 100%);-webkit-background-clip:text;background-clip:text;color:transparent;">DAP</div>
    <p style="margin:6px 0 0;font-size:11px;font-weight:600;letter-spacing:3.5px;text-transform:uppercase;color:#FF4D6D;">Nueva tarea entregada</p>
  </td></tr>

  <tr><td style="padding:0 0 24px 0;">
    <h1 style="margin:0;font-family:'Space Grotesk',Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:#F8FAFC;">Semana ${opts.courseWeek} &middot; ${escaped.moduleTitle}</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#94A3B8;">Bloque: ${escaped.blockTitle}</p>
  </td></tr>

  <tr><td style="padding:0 0 20px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(123,97,255,0.06);border:1px solid rgba(123,97,255,0.18);border-radius:12px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#A28BFF;">Alumno</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#F8FAFC;">${escaped.name}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#CBD5E1;"><a href="mailto:${escaped.email}" style="color:#A28BFF;text-decoration:none;">${escaped.email}</a> &middot; Matrícula ${escaped.matricula}</p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:8px 0 20px 0;">
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#FF4D6D;">Contenido de la tarea</p>
    <div style="background:#0A1224;border:1px solid rgba(248,250,252,0.08);border-radius:12px;padding:20px;font-size:14px;line-height:1.6;color:#E2E8F0;white-space:pre-wrap;">${escaped.content}</div>
  </td></tr>

  <tr><td align="center" style="padding:8px 0 16px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center" bgcolor="#7B61FF" style="background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);background-color:#7B61FF;border-radius:12px;">
        <a href="${escaped.reviewUrl}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;font-family:'Space Grotesk',inherit;letter-spacing:0.3px;">Revisar y corregir</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:18px 0 0 0;border-top:1px solid rgba(248,250,252,0.06);">
    <p style="margin:0;font-size:11px;color:#64748B;line-height:1.6;">Responder a este correo te conecta directo con el alumno (reply-to configurado). Si quieres correrlo a mano, abre el panel de admin para registrar el feedback con IA.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
