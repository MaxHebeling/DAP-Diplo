import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

type AssignmentFeedbackEmailInput = {
  to: string;
  fullName: string;
  moduleTitle: string;
  moduleHref: string;
  passed: boolean;
  score: number;
};

/**
 * Notifica al alumno que su tarea fue corregida y el feedback ya está
 * disponible. NO incluye el feedback completo en el email — el feedback
 * vive en el módulo (mejor experiencia y evita problemas de markdown en
 * clientes de email).
 */
export async function sendAssignmentFeedbackEmail(
  input: AssignmentFeedbackEmailInput,
): Promise<SendEmailResult> {
  const firstName = input.fullName.split(" ")[0];

  return await sendEmail({
    to: input.to,
    subject: input.passed
      ? `Tu tarea fue aprobada — ${input.moduleTitle}`
      : `Tu corrección llegó — ${input.moduleTitle}`,
    html: render({
      firstName,
      moduleTitle: input.moduleTitle,
      moduleHref: input.moduleHref,
      passed: input.passed,
      score: input.score,
    }),
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(p: {
  firstName: string;
  moduleTitle: string;
  moduleHref: string;
  passed: boolean;
  score: number;
}): string {
  const accent = p.passed ? "#22C55E" : "#FF4D6D";
  const intro = p.passed
    ? "Aprobaste la actividad de este módulo. El Dr. Max te dejó un feedback personal."
    : "El Dr. Max revisó tu entrega y te dejó un feedback detallado con próximos pasos.";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tu corrección está lista</title>
</head>
<body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 28px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:${accent};">
            DAP · Corrección lista
          </p>
          <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:700;">
            Hola, ${esc(p.firstName)}.
          </h1>
        </td></tr>

        <tr><td>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#E2E8F0;">
            ${esc(intro)}
          </p>
          <p style="margin:0;font-size:14px;color:#94A3B8;">
            Módulo: <strong style="color:#F8FAFC;">${esc(p.moduleTitle)}</strong>
          </p>
        </td></tr>

        <tr><td align="center" style="padding:32px 0 0;">
          <a href="${esc(p.moduleHref)}"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);color:#fff;font-weight:600;text-decoration:none;border-radius:8px;font-size:14px;">
            Ver mi feedback →
          </a>
        </td></tr>

        <tr><td align="center" style="padding:24px 0 0;">
          <p style="margin:0;font-size:11px;color:#64748B;">
            Tu puntuación: <strong style="color:${accent};">${p.score}/100</strong>
            ${p.passed ? "" : " · Puedes rehacer la entrega cuando quieras."}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
