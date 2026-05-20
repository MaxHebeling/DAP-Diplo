import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

type WeekOpenedEmailInput = {
  to: string;
  fullName: string;
  courseWeek: number;
  moduleTitle: string;
  moduleHref: string;
  closesAt: Date;
};

/**
 * Mail "tu módulo de esta semana ya está disponible" — disparado por el
 * cron diario week-open-notify cuando el martes (en TZ DAP) coincide con
 * el inicio de una nueva semana del alumno.
 */
export async function sendWeekOpenedEmail(
  input: WeekOpenedEmailInput,
): Promise<SendEmailResult> {
  const firstName = input.fullName.split(" ")[0];
  const closes = input.closesAt.toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Los_Angeles",
  });

  return await sendEmail({
    to: input.to,
    subject: `Semana ${input.courseWeek} de 72 · Ya puedes entrar`,
    html: render({
      firstName,
      courseWeek: input.courseWeek,
      moduleTitle: input.moduleTitle,
      moduleHref: input.moduleHref,
      closes,
    }),
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

function render(p: {
  firstName: string;
  courseWeek: number;
  moduleTitle: string;
  moduleHref: string;
  closes: string;
}): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Semana ${p.courseWeek} disponible</title>
</head>
<body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 28px 0;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">
            DAP · Semana ${p.courseWeek} de 72
          </p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;color:#F8FAFC;">
            Tu módulo de esta semana ya está disponible
          </h1>
        </td></tr>
        <tr><td>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#E2E8F0;">
            Hola, ${escapeHtml(p.firstName)}. Esta semana entras a:
          </p>
          <p style="margin:0;font-size:20px;line-height:1.4;font-weight:600;color:#F8FAFC;">
            ${escapeHtml(p.moduleTitle)}
          </p>
        </td></tr>
        <tr><td style="padding:20px 0 0;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#CBD5E1;">
            La tarea cierra el <strong>${escapeHtml(p.closes)} a las 23:59</strong>.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:32px 0 0;">
          <a href="${escapeHtml(p.moduleHref)}"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);color:#fff;font-weight:600;text-decoration:none;border-radius:8px;font-size:14px;">
            Entrar al módulo →
          </a>
        </td></tr>
        <tr><td align="center" style="padding:32px 0 0;">
          <p style="margin:0;font-size:11px;color:#64748B;">
            Si no puedes esta semana, el contenido sigue accesible después en repaso. La tarea sí cierra el lunes.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
