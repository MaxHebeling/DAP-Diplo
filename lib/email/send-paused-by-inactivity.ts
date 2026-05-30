import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Aviso cuando pausamos automáticamente el cobro por inactividad.
 * Tono pastoral, sin culpa: "no te cobramos hasta que retomes".
 */
export async function sendPausedByInactivityEmail(
  userId: string,
  daysInactive: number,
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
  const html = renderHtml({ firstName, daysInactive, appUrl });

  return await sendEmail({
    to: userData.user.email,
    subject: "Tu cobro está pausado — sin cargo hasta que retomes",
    html,
  });
}

function renderHtml(opts: {
  firstName: string;
  daysInactive: number;
  appUrl: string;
}): string {
  const { firstName, daysInactive, appUrl } = opts;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cobro pausado</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0a0a0a;">
<tr><td align="center" style="padding:0 0 32px 0;">
<div style="font-family:Georgia,'Playfair Display',serif;font-size:32px;font-weight:600;letter-spacing:-0.5px;color:#fafafa;">DAP<span style="color:#fdad5a;">.</span></div>
</td></tr>
<tr><td style="padding:0 8px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#fdad5a;">Cobro pausado · Sin cargo</p>
<h1 style="margin:0 0 24px;font-family:Georgia,'Playfair Display',serif;font-size:32px;line-height:1.2;font-weight:600;color:#fafafa;">Pausamos tu cobro, ${escapeHtml(firstName)}.</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;">Detectamos que llevas <strong style="color:#fafafa;">${daysInactive} días</strong> sin avanzar en tus módulos. Por eso pausamos tu cobro mensual: <strong style="color:#fdad5a;">Stripe no te cobrará</strong> hasta que vuelvas a estudiar.</p>
<p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#d4d4d4;">Tu progreso queda guardado. Cuando entres y completes un módulo, la suscripción se reactiva automáticamente y retomás donde dejaste.</p>
</td></tr>
<tr><td align="center" style="padding:0 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
<a href="${appUrl}/dashboard" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">Retomar mis módulos →</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 8px 0;border-top:1px solid #1f1f1f;">
<p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#737373;"><strong style="color:#a3a3a3;">Política DAP:</strong> el llamado se desarrolla con constancia, no con presión. Por eso no te cobramos en meses que no avanzás.</p>
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
