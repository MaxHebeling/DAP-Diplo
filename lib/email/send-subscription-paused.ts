import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email cuando se pausa la suscripción porque el alumno no completó
 * los módulos del mes actual antes del próximo ciclo de cobro.
 *
 * El tono es de cuidado, NO castigo: no le cobramos para no presionar,
 * acceso al mes actual sigue activo, retoma cuando complete.
 */
export async function sendSubscriptionPausedEmail(
  userId: string,
  currentMonth: number,
  approvedCount: number,
  totalCount: number,
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
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";
  const html = renderHtml({
    firstName,
    currentMonth,
    approvedCount,
    totalCount,
    appUrl,
  });

  return await sendEmail({
    to: userData.user.email,
    subject: `Tu cobro mensual está pausado — Mes ${currentMonth}`,
    html,
  });
}

function renderHtml(opts: {
  firstName: string;
  currentMonth: number;
  approvedCount: number;
  totalCount: number;
  appUrl: string;
}): string {
  const { firstName, currentMonth, approvedCount, totalCount, appUrl } = opts;
  const pending = Math.max(0, totalCount - approvedCount);
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
<h1 style="margin:0 0 24px;font-family:Georgia,'Playfair Display',serif;font-size:32px;line-height:1.2;font-weight:600;color:#fafafa;">
Tomate el tiempo que necesites, ${escapeHtml(firstName)}.
</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;">
Detectamos que aún tienes <strong style="color:#fafafa;">${pending} módulos pendientes</strong> del <strong style="color:#fafafa;">Mes ${currentMonth}</strong> (llevas ${approvedCount} de ${totalCount}). Por eso pausamos tu cobro mensual: <strong style="color:#fdad5a;">Stripe no te cobrará</strong> hasta que estés listo.
</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#d4d4d4;">
Conservas el acceso al Mes ${currentMonth} para que termines a tu ritmo. Cuando apruebes el último módulo pendiente, tu suscripción se reactivará automáticamente, Stripe procesará el cobro de ese mes y podrás avanzar al Mes ${currentMonth + 1}.
</p>
</td></tr>
<tr><td align="center" style="padding:0 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="#fdad5a" style="background:#fdad5a;border-radius:8px;">
<a href="${appUrl}/dashboard" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0a;text-decoration:none;font-family:inherit;">Ir a mis módulos pendientes →</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 8px 0;border-top:1px solid #1f1f1f;">
<p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#737373;">
<strong style="color:#a3a3a3;">¿Necesitas más tiempo?</strong> Si no logras completar este mes en las próximas semanas, puedes pedir una extensión de 60 días por bloque desde tu dashboard.
</p>
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
