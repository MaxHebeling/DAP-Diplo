import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

/**
 * Email transaccional "Oferta DAP" para mandarle a un lead desde el
 * panel admin. Personalizado con nombre del lead y mención a su país
 * cuando se conoce.
 *
 * Si el lead es de Argentina, sumamos el bloque del descuento de
 * matrimonio AR (USD $35/mes para los dos cónyuges).
 */
export async function sendDapOfferEmail(opts: {
  to: string;
  firstName: string | null;
  country: string | null;
  countryCode: string | null;
}): Promise<SendEmailResult> {
  const { to, firstName, country, countryCode } = opts;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";
  const isArgentina = countryCode === "AR";

  const html = renderHtml({
    firstName: firstName ?? "Hermano",
    country,
    isArgentina,
    appUrl,
  });

  return await sendEmail({
    to,
    subject: "Una invitación personal · Diplomado Apostólico Pastoral",
    html,
  });
}

function renderHtml(opts: {
  firstName: string;
  country: string | null;
  isArgentina: boolean;
  appUrl: string;
}): string {
  const { firstName, country, isArgentina, appUrl } = opts;
  const escapedName = escapeHtml(firstName);
  const greeting = country
    ? `Te escribimos desde DAP a ${escapeHtml(country)}.`
    : "Te escribimos desde el equipo de DAP.";

  const argentinaBlock = isArgentina
    ? `
      <tr><td style="padding:0 8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(123,97,255,0.06);border:1px solid rgba(123,97,255,0.18);border-radius:14px;">
          <tr><td style="padding:24px 24px;">
            <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">🇦🇷 Especial para Argentina</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#CBD5E1;">Si te inscribes junto a tu cónyuge, hay una <strong style="color:#F8FAFC;">oportunidad especial: USD $35 al mes para los dos</strong> (una sola suscripción cubre el acceso completo de ambos).</p>
          </td></tr>
        </table>
      </td></tr>`
    : "";

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><title>Invitación al DAP</title></head>
<body style="margin:0;padding:0;background:#04081A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#04081A;"><tr><td align="center" style="padding:48px 20px 24px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:0 0 40px 0;"><div style="font-family:'Space Grotesk',-apple-system,Helvetica,sans-serif;font-size:42px;font-weight:700;letter-spacing:-1px;background:linear-gradient(135deg,#F8FAFC 0%,#A28BFF 60%,#FF4D6D 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:transparent;">DAP</div></td></tr>
<tr><td style="padding:0 8px;">
  <p style="margin:0 0 18px;font-size:11px;font-weight:600;letter-spacing:4.5px;text-transform:uppercase;color:#FF4D6D;">Una invitación personal</p>
  <h1 style="margin:0 0 24px;font-family:'Space Grotesk',-apple-system,Georgia,serif;font-size:32px;line-height:1.15;font-weight:700;color:#F8FAFC;letter-spacing:-0.5px;">${escapedName},<br>esto es para vos.</h1>
  <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#CBD5E1;">${greeting} Notamos tu interés en el Diplomado Apostólico Pastoral y quería escribirte personalmente.</p>
  <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#CBD5E1;">El DAP es un proceso de 18 meses para pastores y líderes que ya no se conforman con solo predicar. <strong style="color:#F8FAFC;font-weight:600;">9 dimensiones de la unción apostólica</strong> en un mismo programa: pastor, administrador, reformador, empresario, estratega, mentor, comunicador y gobernador espiritual.</p>
  <p style="margin:0 0 36px;font-size:16px;line-height:1.65;color:#CBD5E1;">Cada martes a las 00:01 se abre un módulo nuevo. La activación práctica la corrige personalmente el Ap. Max Hebeling con feedback en 48 horas. MasterClass en vivo cada mes.</p>
</td></tr>
<tr><td align="center" style="padding:0 8px 40px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#7B61FF" style="background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);background-color:#7B61FF;border-radius:12px;"><a href="${appUrl}/suscribirme" target="_blank" style="display:inline-block;padding:16px 36px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;font-family:'Space Grotesk',inherit;letter-spacing:0.3px;">Quiero inscribirme</a></td></tr></table>
  <p style="margin:18px 0 0;font-size:12px;color:#64748B;line-height:1.5;">Inicio de clases: martes 23 de junio de 2026</p>
</td></tr>
${argentinaBlock}
<tr><td style="padding:32px 8px 0;border-top:1px solid rgba(248,250,252,0.06);">
  <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#CBD5E1;">Si quieres conversar antes de decidir, puedes responderme directo a este correo o escribirme al WhatsApp:</p>
  <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#F8FAFC;font-weight:600;">+1 956 509 5558</p>
</td></tr>
<tr><td align="center" style="padding:24px 8px 0;">
  <p style="margin:0 0 8px;font-size:11px;line-height:1.6;color:#64748B;">— Ap. Max Hebeling</p>
  <p style="margin:0 0 8px;font-size:11px;line-height:1.6;color:#64748B;">© 2026 DAP · Diplomado Apostólico Pastoral</p>
  <p style="margin:0;font-size:10px;line-height:1.6;color:#475569;">Departamento de educación de Revival &amp; Kingdom Ministries, INC.<br>Recibes este correo porque dejaste tus datos en <a href="${appUrl}" style="color:#7B61FF;text-decoration:none;">dapglobal.org</a></p>
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
