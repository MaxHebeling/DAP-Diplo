import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email final cuando se canceló la suscripción por timeout (60 días en
 * pausa) o cuando el alumno cancela voluntariamente desde el portal.
 * Tono: puerta abierta, sin culpa, progreso preservado.
 */
export async function sendSubscriptionCanceledEmail(
  userId: string,
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";
  const html = renderHtml({ firstName, appUrl });

  return await sendEmail({
    to: userData.user.email,
    subject: "Tu suscripción del DAP se canceló",
    html,
  });
}

function renderHtml(opts: { firstName: string; appUrl: string }): string {
  const { firstName, appUrl } = opts;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Suscripción cancelada</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;">
<tr><td align="center" style="padding:0 0 32px 0;">
<div style="font-family:Georgia,'Playfair Display',serif;font-size:32px;font-weight:600;letter-spacing:-0.5px;color:#fafafa;">DAP<span style="color:#fdad5a;">.</span></div>
</td></tr>
<tr><td style="padding:0 8px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#a3a3a3;">Suscripción cancelada</p>
<h1 style="margin:0 0 24px;font-family:Georgia,'Playfair Display',serif;font-size:30px;line-height:1.2;font-weight:600;color:#fafafa;">Hasta la próxima, ${escapeHtml(firstName)}.</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;">Tu suscripción al DAP quedó cancelada. Ya no se generarán cobros y temporalmente perdiste el acceso al contenido.</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;"><strong style="color:#fafafa;">Tu progreso se conservó.</strong> Cuando reactives tu suscripción retomas exactamente donde quedaste — los módulos aprobados siguen aprobados, las dimensiones que alcanzaste se mantienen.</p>
<p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#d4d4d4;">Si fue por algo que podamos mejorar, escríbenos respondiendo a este correo. Te leemos.</p>
</td></tr>
<tr><td align="center" style="padding:0 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
<a href="${appUrl}/suscribirme" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">Reactivar suscripción →</a>
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
