import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envía email al alumno cuando avanza al siguiente mes académico
 * (try_advance_month detectó que pagó + aprobó el mes anterior).
 *
 * Idempotencia: el caller (webhook stripe + handler de aprobación) ya
 * verifica que el mes realmente cambió antes de llamar. Si ese caller
 * dispara 2 veces por error, el alumno recibe 2 emails — aceptable.
 */
export async function sendMonthAdvancedEmail(
  userId: string,
  newMonth: number,
): Promise<SendEmailResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) {
    return { ok: false, error: `profile not found userId=${userId}` };
  }
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  if (!userData.user?.email) {
    return { ok: false, error: `email not found userId=${userId}` };
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "Ministro";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";
  const html = renderHtml({ firstName, newMonth, appUrl });

  return await sendEmail({
    to: userData.user.email,
    subject: `Bienvenido al Mes ${newMonth} del DAP`,
    html,
  });
}

function renderHtml(opts: {
  firstName: string;
  newMonth: number;
  appUrl: string;
}): string {
  const { firstName, newMonth, appUrl } = opts;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bienvenido al Mes ${newMonth}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;">
<tr><td align="center" style="padding:0 0 32px 0;">
<div style="font-family:Georgia,'Playfair Display',serif;font-size:32px;font-weight:600;letter-spacing:-0.5px;color:#fafafa;">DAP<span style="color:#fdad5a;">.</span></div>
</td></tr>
<tr><td style="padding:0 8px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#fdad5a;">Nuevo mes desbloqueado</p>
<h1 style="margin:0 0 24px;font-family:Georgia,'Playfair Display',serif;font-size:36px;line-height:1.15;font-weight:600;color:#fafafa;">
Bienvenido al Mes ${newMonth}, ${escapeHtml(firstName)}.
</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;">
Aprobaste los módulos del mes anterior y tu pago se procesó correctamente. Ya tienes acceso a los nuevos módulos del <strong style="color:#fafafa;">Mes ${newMonth} de 18</strong>.
</p>
<p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#d4d4d4;">
Recuerda: para avanzar al Mes ${newMonth + 1} necesitas completar los módulos de este mes antes del próximo ciclo de cobro.
</p>
</td></tr>
<tr><td align="center" style="padding:0 8px 36px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
<a href="${appUrl}/dashboard" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">Ver el Mes ${newMonth} →</a>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:24px 8px 0;border-top:1px solid #1f1f1f;">
<p style="margin:0;font-size:11px;color:#525252;">© 2026 DAP — Diplomado Apostólico Pastoral.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
