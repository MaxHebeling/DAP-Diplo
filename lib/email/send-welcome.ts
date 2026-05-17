import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envía email de bienvenida al alumno tras crear su suscripción.
 *
 * Idempotencia: no implementada acá. La idempotencia vive a nivel
 * del webhook (stripe_events_processed). Si subscription.created
 * llega 2 veces, el segundo procesado es no-op antes de llegar a
 * llamar esta función.
 *
 * Política de error: si Resend falla, log y return result (no throw).
 * El webhook decide qué hacer con el resultado (típicamente: log
 * pero seguir adelante; el alumno ya tiene su suscripción).
 */
export async function sendWelcomeEmail(userId: string): Promise<SendEmailResult> {
  const admin = createAdminClient();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr || !profile) {
    return {
      ok: false,
      error: `Profile no encontrado para userId=${userId}: ${profileErr?.message ?? "missing"}`,
    };
  }

  // Email viene de auth.users (no está en profiles). Lo leemos vía admin API.
  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(userId);
  if (userErr || !userData.user?.email) {
    return {
      ok: false,
      error: `Email no encontrado para userId=${userId}: ${userErr?.message ?? "missing"}`,
    };
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "Pastor";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";

  const html = renderWelcomeHtml({ firstName, appUrl });

  return await sendEmail({
    to: userData.user.email,
    subject: "Bienvenido al DAP — tu formación apostólica comienza.",
    html,
  });
}

// --- template HTML --------------------------------------------------

function renderWelcomeHtml(opts: {
  firstName: string;
  appUrl: string;
}): string {
  const { firstName, appUrl } = opts;
  // Inline styles — los clientes de email no respetan stylesheets.
  // Bulletproof button via table cell para Outlook.
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>Bienvenido al DAP</title>
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
                  Diplomado Apostólico Pastoral
                </p>
                <h1 style="margin:0 0 24px;font-family:Georgia,'Playfair Display',serif;font-size:36px;line-height:1.15;font-weight:600;color:#fafafa;">
                  Bienvenido, ${escapeHtml(firstName)}.
                </h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;">
                  Tu suscripción de <strong style="color:#fafafa;">$25 USD/mes</strong> está activa.
                  Ya tienes acceso al <strong style="color:#fafafa;">Bloque 1 — Fundamentos Espirituales</strong>,
                  con sus 22 módulos.
                </p>
                <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#d4d4d4;">
                  Cada 2 meses se libera un bloque nuevo. En 18 meses completas
                  los 9 bloques y obtienes los 9 rangos ministeriales — de
                  Discípulo hasta Enviado.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 8px 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
                      <a href="${appUrl}/dashboard" target="_blank"
                         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">
                        Ir a mi dashboard →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 8px 0;border-top:1px solid #1f1f1f;">
                <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#737373;">
                  <strong style="color:#a3a3a3;">¿Cómo gestiono mi suscripción?</strong>
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#737373;">
                  Desde tu dashboard, en el card "Tu suscripción", click
                  "Gestionar mi suscripción" para cambiar tarjeta, ver
                  facturas o cancelar cuando quieras. Si cancelas, conservas
                  tu progreso para cuando reactives.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:24px 8px 0;">
                <p style="margin:0;font-size:11px;color:#525252;">
                  © 2026 DAP — Diplomado Apostólico Pastoral.<br>
                  Recibes este correo porque te suscribiste en
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
