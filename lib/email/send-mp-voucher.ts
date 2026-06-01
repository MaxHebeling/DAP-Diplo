import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Email con el link de pago mensual (voucher) para alumnos AR que
 * eligieron pagar en efectivo / Checkout Pro.
 *
 * Se manda en 2 momentos:
 *   1. Al inscribirse (primer voucher) — kind='initial'
 *   2. Cada mes 5 días antes del vencimiento (renovación) — kind='renewal'
 */
export async function sendMpVoucherEmail(opts: {
  userId: string;
  checkoutUrl: string;
  amountArs: number;
  kind: "initial" | "renewal";
  currentPeriodEnd: Date | null;
}): Promise<SendEmailResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", opts.userId)
    .maybeSingle();
  if (!profile) {
    return { ok: false, error: `profile not found userId=${opts.userId}` };
  }
  const { data: userData } = await admin.auth.admin.getUserById(opts.userId);
  if (!userData.user?.email) {
    return { ok: false, error: `email not found userId=${opts.userId}` };
  }

  const firstName = profile.full_name?.split(" ")[0] ?? "Alumno";
  const subject =
    opts.kind === "initial"
      ? "Tu link de pago del DAP (efectivo / transferencia)"
      : "Renová tu suscripción del DAP — tu próximo pago";

  const html = renderHtml({
    firstName,
    checkoutUrl: opts.checkoutUrl,
    amountArs: opts.amountArs,
    kind: opts.kind,
    currentPeriodEnd: opts.currentPeriodEnd,
  });

  return await sendEmail({
    to: userData.user.email,
    subject,
    html,
  });
}

function renderHtml(opts: {
  firstName: string;
  checkoutUrl: string;
  amountArs: number;
  kind: "initial" | "renewal";
  currentPeriodEnd: Date | null;
}): string {
  const { firstName, checkoutUrl, amountArs, kind, currentPeriodEnd } = opts;
  const amountLabel = amountArs.toLocaleString("es-AR");
  const deadline = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const intro =
    kind === "initial"
      ? `Bienvenido al <strong>Diplomado Apostólico Pastoral</strong>. Te dejamos el link para completar tu primer pago.`
      : `Tu suscripción al DAP se vence el <strong>${deadline}</strong>. Te enviamos tu próximo link de pago para que renueves a tiempo.`;

  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#E5E7F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
<tr><td align="center" style="padding:48px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#0F1E3F;border:1px solid #1F2A47;border-radius:14px;overflow:hidden;">

<tr><td style="height:4px;background:linear-gradient(90deg,#7B61FF 0%,#FF4D6D 100%);font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td align="center" style="padding:36px 24px 8px;">
<img src="https://dap-diplo.vercel.app/dap-logo-white.png" width="80" height="80" alt="DAP" style="display:block;border:0;outline:none;">
</td></tr>

<tr><td align="center" style="padding:0 24px 32px;">
<div style="font-family:Georgia,serif;font-size:14px;letter-spacing:6px;text-transform:uppercase;color:#C9A961;">Diplomado Apostólico Pastoral</div>
</td></tr>

<tr><td style="padding:0 36px;">
<p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">${kind === "initial" ? "Primer pago" : "Renovación mensual"}</p>
<h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:28px;line-height:1.25;font-weight:600;color:#FFFFFF;">Hola ${escapeHtml(firstName)}.</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#E5E7F0;">${intro}</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#E5E7F0;">Click el botón abajo y elegí cómo pagar: <strong>tarjeta, débito, transferencia, RapiPago, PagoFácil o saldo Mercado Pago</strong>.</p>
</td></tr>

<tr><td style="padding:8px 36px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;border:1px solid #1F2A47;border-radius:10px;">
<tr><td style="padding:20px 22px;text-align:center;">
<p style="margin:0 0 6px;font-size:12px;color:#A8B0C4;">Monto a pagar</p>
<p style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:600;color:#FFFFFF;">$${amountLabel} <span style="font-size:18px;color:#A8B0C4;">ARS</span></p>
</td></tr></table>
</td></tr>

<tr><td align="center" style="padding:8px 36px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);border-radius:10px;">
<a href="${checkoutUrl}" target="_blank" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;font-family:inherit;letter-spacing:0.3px;">Ir a pagar →</a>
</td></tr></table>
</td></tr>

<tr><td style="padding:0 36px 24px;">
<p style="margin:0;font-size:13px;line-height:1.6;color:#A8B0C4;text-align:center;">El link expira en <strong style="color:#E5E7F0;">7 días</strong>. Si pagás en efectivo (RapiPago / PagoFácil), tu acceso se activa apenas se acredite el pago (24-48 hs).</p>
</td></tr>

<tr><td style="padding:24px 36px 32px;border-top:1px solid #1F2A47;">
<p style="margin:0;font-size:11px;color:#A8B0C4;text-align:center;letter-spacing:0.5px;">© 2026 Revival &amp; Kingdom Ministries, INC. · DAP.</p>
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
