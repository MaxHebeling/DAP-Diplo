import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Aviso final cuando llevan 50+ días pausados. ~10 días para evitar
 * cancelación automática.
 */
export async function sendPauseWarning50Email(
  userId: string,
  daysInPause: number,
): Promise<SendEmailResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return { ok: false, error: `profile not found userId=${userId}` };
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  if (!userData.user?.email) return { ok: false, error: `email not found userId=${userId}` };

  const firstName = profile.full_name?.split(" ")[0] ?? "Ministro";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";
  const daysLeft = Math.max(0, 60 - daysInPause);
  const html = renderHtml({ firstName, daysLeft, appUrl });

  return await sendEmail({
    to: userData.user.email,
    subject: `Última semana: tu suscripción se cancela en ${daysLeft} días`,
    html,
  });
}

function renderHtml(opts: {
  firstName: string;
  daysLeft: number;
  appUrl: string;
}): string {
  const { firstName, daysLeft, appUrl } = opts;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Última semana</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;">
<tr><td align="center" style="padding:0 0 32px 0;">
<div style="font-family:Georgia,'Playfair Display',serif;font-size:32px;font-weight:600;letter-spacing:-0.5px;color:#fafafa;">DAP<span style="color:#fdad5a;">.</span></div>
</td></tr>
<tr><td style="padding:0 8px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#dc2626;">Última semana antes de cancelar</p>
<h1 style="margin:0 0 24px;font-family:Georgia,'Playfair Display',serif;font-size:30px;line-height:1.2;font-weight:600;color:#fafafa;">Quedan ${daysLeft} días, ${escapeHtml(firstName)}.</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;">Llevas 50 días con tu suscripción pausada por inactividad. Si no retomas en los próximos <strong style="color:#fdad5a;">${daysLeft} días</strong>, la suscripción se cancelará automáticamente. Tu progreso queda guardado de todos modos.</p>
<p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#d4d4d4;">Para reactivarla: entrá al dashboard y completá cualquier módulo pendiente. El cobro se reanuda automáticamente.</p>
</td></tr>
<tr><td align="center" style="padding:0 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
<a href="${appUrl}/dashboard" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">Ir al dashboard →</a>
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
