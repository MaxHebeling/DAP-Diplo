import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import {
  LIVE_KIND_LABEL,
  type LiveKind,
} from "@/lib/live-sessions/schemas";

export type ReminderRecipient = {
  email: string;
  firstName: string;
};

export type ReminderSession = {
  id: string;
  kind: LiveKind;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  host_name: string | null;
};

export async function sendSessionReminderEmail(
  to: ReminderRecipient,
  session: ReminderSession,
): Promise<SendEmailResult> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";
  const html = renderReminderHtml({ to, session, appUrl });
  return await sendEmail({
    to: to.email,
    subject: `${session.title} empieza en 1 hora`,
    html,
  });
}

// --- template HTML --------------------------------------------------

function renderReminderHtml(opts: {
  to: ReminderRecipient;
  session: ReminderSession;
  appUrl: string;
}): string {
  const { to, session, appUrl } = opts;
  const date = new Date(session.scheduled_at);
  const timeStr = date.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const dateStr = date.toLocaleDateString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>${escapeHtml(session.title)} empieza en 1 hora</title>
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
                  En vivo · ${escapeHtml(LIVE_KIND_LABEL[session.kind])}
                </p>
                <h1 style="margin:0 0 20px;font-family:Georgia,'Playfair Display',serif;font-size:30px;line-height:1.2;font-weight:600;color:#fafafa;">
                  ${escapeHtml(session.title)}
                </h1>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#d4d4d4;">
                  Hola ${escapeHtml(to.firstName)}, esta sesión empieza en
                  <strong style="color:#fdad5a;">1 hora</strong>.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border:1px solid #1f1f1f;border-radius:10px;width:100%;">
                  <tr>
                    <td style="padding:16px 18px;font-size:13px;color:#a3a3a3;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                        <tr>
                          <td style="padding:4px 0;font-weight:600;color:#737373;letter-spacing:2px;text-transform:uppercase;font-size:10px;">
                            Fecha
                          </td>
                          <td style="padding:4px 0;text-align:right;color:#fafafa;">${escapeHtml(dateStr)}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:600;color:#737373;letter-spacing:2px;text-transform:uppercase;font-size:10px;">
                            Hora (UTC)
                          </td>
                          <td style="padding:4px 0;text-align:right;color:#fafafa;">${escapeHtml(timeStr)}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;font-weight:600;color:#737373;letter-spacing:2px;text-transform:uppercase;font-size:10px;">
                            Duración
                          </td>
                          <td style="padding:4px 0;text-align:right;color:#fafafa;">${session.duration_minutes} min</td>
                        </tr>
                        ${
                          session.host_name
                            ? `<tr>
                          <td style="padding:4px 0;font-weight:600;color:#737373;letter-spacing:2px;text-transform:uppercase;font-size:10px;">Imparte</td>
                          <td style="padding:4px 0;text-align:right;color:#fafafa;">${escapeHtml(session.host_name)}</td>
                        </tr>`
                            : ""
                        }
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 8px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
                      <a href="${session.meeting_url}" target="_blank"
                         style="display:inline-phase;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">
                        Unirme a la sesión →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 8px 32px;">
                <a href="${appUrl}/en-vivo" target="_blank"
                   style="font-size:13px;color:#a3a3a3;text-decoration:underline;">
                  Ver todas las sesiones
                </a>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:24px 8px 0;border-top:1px solid #1f1f1f;">
                <p style="margin:0;font-size:11px;color:#525252;">
                  © 2026 DAP — Diplomado Apostólico Pastoral.<br>
                  Recibes este correo porque tienes una suscripción activa en
                  <a href="${appUrl}" style="color:#737373;text-decoration:underline;">dap-diplo.vercel.app</a>.
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
