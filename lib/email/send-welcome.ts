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

  const firstName = profile.full_name?.split(" ")[0] ?? "Ministro";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";

  const html = renderWelcomeHtml({ firstName, appUrl });

  return await sendEmail({
    to: userData.user.email,
    subject: "Bienvenido al DAP · Tu formación apostólica comienza.",
    html,
  });
}

// --- template HTML --------------------------------------------------

/**
 * Template inline-styled (los clientes de email no respetan stylesheets).
 * Brand DAP: Midnight Navy #07142B base · Violet #7B61FF + Coral #FF4D6D
 * accents · White highlights #F8FAFC.
 * Bulletproof tables para compatibilidad Outlook.
 */
function renderWelcomeHtml(opts: {
  firstName: string;
  appUrl: string;
}): string {
  const { firstName, appUrl } = opts;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>Bienvenido al DAP</title>
  </head>
  <body style="margin:0;padding:0;background:#04081A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;-webkit-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#04081A;">
      <tr>
        <td align="center" style="padding:48px 20px 24px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

            <!-- Logo DAP -->
            <tr>
              <td align="center" style="padding:0 0 40px 0;">
                <div style="font-family:'Space Grotesk',-apple-system,Helvetica,sans-serif;font-size:42px;font-weight:700;letter-spacing:-1px;color:#F8FAFC;background:linear-gradient(135deg,#F8FAFC 0%,#A28BFF 60%,#FF4D6D 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:transparent;">
                  DAP
                </div>
              </td>
            </tr>

            <!-- Eyebrow + Headline -->
            <tr>
              <td style="padding:0 8px;">
                <p style="margin:0 0 18px;font-size:11px;font-weight:600;letter-spacing:4.5px;text-transform:uppercase;color:#FF4D6D;">
                  Tu inscripción está activa
                </p>
                <h1 style="margin:0 0 28px;font-family:'Space Grotesk',-apple-system,Georgia,serif;font-size:36px;line-height:1.1;font-weight:700;color:#F8FAFC;letter-spacing:-0.5px;">
                  Bienvenido,<br>${escapeHtml(firstName)}.
                </h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#CBD5E1;">
                  Tu suscripción de <strong style="color:#F8FAFC;font-weight:600;">USD $25 al mes</strong> quedó activa.
                  Ya tenés acceso al <strong style="color:#F8FAFC;font-weight:600;">Bloque 1 — Raíces (Fundamentos Espirituales)</strong>,
                  el primero de los nueve bloques del proceso.
                </p>
                <p style="margin:0 0 36px;font-size:16px;line-height:1.65;color:#CBD5E1;">
                  Cada martes a las 00:01 (hora San Diego) se abre un módulo nuevo.
                  Tu camino: <strong style="color:#F8FAFC;font-weight:600;">72 semanas · 9 bloques · 9 dimensiones ministeriales</strong>,
                  de Discípulo hasta Enviado.
                </p>
              </td>
            </tr>

            <!-- CTA Button (bulletproof) -->
            <tr>
              <td align="center" style="padding:0 8px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#7B61FF" style="background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);background-color:#7B61FF;border-radius:12px;">
                      <a href="${appUrl}/dashboard" target="_blank"
                         style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;font-family:'Space Grotesk',inherit;letter-spacing:0.3px;">
                        Entrar al dashboard
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Qué te espera (highlight box) -->
            <tr>
              <td style="padding:0 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(123,97,255,0.06);border:1px solid rgba(123,97,255,0.18);border-radius:14px;">
                  <tr>
                    <td style="padding:24px 24px;">
                      <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">
                        Qué te espera
                      </p>
                      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#CBD5E1;">
                        <strong style="color:#F8FAFC;font-weight:600;">→ 1 módulo cada semana</strong> · cada martes 00:01
                      </p>
                      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#CBD5E1;">
                        <strong style="color:#F8FAFC;font-weight:600;">→ Activación práctica corregida personalmente</strong> · feedback en 48 horas
                      </p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#CBD5E1;">
                        <strong style="color:#F8FAFC;font-weight:600;">→ MasterClass en vivo mensual</strong> · comunidad apostólica
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Gestionar suscripción -->
            <tr>
              <td style="padding:32px 8px 0;border-top:1px solid rgba(248,250,252,0.06);">
                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#94A3B8;">
                  <strong style="color:#CBD5E1;font-weight:600;">¿Cómo gestionás tu suscripción?</strong>
                </p>
                <p style="margin:0 0 28px;font-size:13px;line-height:1.65;color:#94A3B8;">
                  Desde tu dashboard, en el card <em>“Tu suscripción”</em>, clickeá
                  <em>“Gestionar mi suscripción”</em> para cambiar la tarjeta,
                  ver tus facturas o cancelar cuando quieras. Si cancelás,
                  conservás tu progreso para cuando reactives.
                </p>
              </td>
            </tr>

            <!-- Footer institucional -->
            <tr>
              <td align="center" style="padding:24px 8px 0;">
                <p style="margin:0 0 8px;font-size:11px;line-height:1.6;color:#64748B;">
                  © 2026 DAP · Diplomado Apostólico Pastoral
                </p>
                <p style="margin:0;font-size:10px;line-height:1.6;color:#475569;">
                  Departamento de educación de Revival &amp; Kingdom Ministries, INC.<br>
                  Recibís este correo porque te suscribiste en
                  <a href="${appUrl}" style="color:#7B61FF;text-decoration:none;">dapglobal.org</a>
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
