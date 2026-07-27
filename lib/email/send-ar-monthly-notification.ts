import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

const MONTHS = ["","enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

export type ArNotificationType = "pre_period" | "period_start" | "mid_period" | "last_day" | "overdue";

type BasePayload = {
  to: string;
  fullName: string;                // "Juan" o "Juan y María" para matrimonios
  modality: "individual" | "marriage";
  amountArs: number;
  year: number;
  month: number;
  collectionStart: string;         // ISO date
  collectionEnd: string;           // ISO date
  pastorName: string | null;
  pastorPhone?: string | null;
  type: ArNotificationType;
};

/**
 * Envía la notificación AR según el tipo. Genera subject/body dinámicos.
 */
export async function sendArMonthlyNotification(p: BasePayload): Promise<SendEmailResult> {
  const firstName = p.fullName.trim().split(/\s+/)[0];
  const monthLabel = MONTHS[p.month];
  const periodLabel = `${monthLabel} ${p.year}`;
  const startDay = new Date(p.collectionStart).getUTCDate();
  const endDay = new Date(p.collectionEnd).getUTCDate();
  const isMarriage = p.modality === "marriage";

  const subject = subjectFor(p.type, firstName, periodLabel, endDay, p.month);
  const html = renderBody({
    ...p, firstName, monthLabel, periodLabel, startDay, endDay, isMarriage,
  });
  return await sendEmail({
    to: p.to,
    subject,
    html,
    replyTo: process.env.EMAIL_ADMISSIONS,
  });
}

function subjectFor(type: ArNotificationType, firstName: string, period: string, endDay: number, monthIdx: number): string {
  const m = MONTHS[monthIdx];
  switch (type) {
    case "pre_period":   return `${firstName}, el ${period} arranca el periodo de pago`;
    case "period_start": return `${firstName}, comenzó el periodo para pagar ${period}`;
    case "mid_period":   return `${firstName}, quedan pocos días para pagar ${period}`;
    case "last_day":     return `${firstName}, hoy es el último día para pagar ${m}`;
    case "overdue":      return `${firstName}, tu pago de ${m} sigue pendiente`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderBody(p: BasePayload & {
  firstName: string; monthLabel: string; periodLabel: string;
  startDay: number; endDay: number; isMarriage: boolean;
}): string {
  const headerColor = {
    pre_period:  "#00E5FF",
    period_start: "#FF4D6D",
    mid_period:  "#F59E0B",
    last_day:    "#EF4444",
    overdue:     "#EF4444",
  }[p.type];

  const eyebrowText = {
    pre_period:   "DAP · Recordatorio previo",
    period_start: "DAP · Periodo de pago abierto",
    mid_period:   "DAP · Recordatorio",
    last_day:     "DAP · Último día",
    overdue:      "DAP · Pago pendiente",
  }[p.type];

  const headline = {
    pre_period:   `${p.firstName}, próximamente arranca el periodo de pago`,
    period_start: `${p.firstName}, ya comenzó el periodo para entregar tu pago`,
    mid_period:   `${p.firstName}, no dejes tu pago para lo último`,
    last_day:     `${p.firstName}, HOY es el último día`,
    overdue:      `${p.firstName}, tu pago de ${p.monthLabel} sigue pendiente`,
  }[p.type];

  const bodyIntro = {
    pre_period: `El <strong>día 23</strong> de ${p.monthLabel} arranca el periodo mensual para entregar tu pago a tus pastores. Te aviso con anticipación para que puedas organizarte.`,
    period_start: `Ya podés entregar tu pago correspondiente a <strong>${p.periodLabel}</strong> a tus pastores. El periodo va del <strong>${p.startDay}</strong> al <strong>${p.endDay}</strong> de ${p.monthLabel}.`,
    mid_period: `El periodo de recolección cierra el <strong>${p.endDay}</strong> de ${p.monthLabel}. Si aún no entregaste el pago de ${p.periodLabel}, coordiná con tu pastor lo antes posible.`,
    last_day: `Hoy es el <strong>último día</strong> del periodo mensual para entregar tu pago a tus pastores. Los pastores realizan la transferencia consolidada a DAP el día 1.`,
    overdue: `Tu pago correspondiente a ${p.periodLabel} figura como pendiente. Tu pastor está próximo a realizar (o ya realizó) la transferencia consolidada a DAP. Contactalo para regularizar.`,
  }[p.type];

  const inscriptionLine = p.isMarriage
    ? `Esta mensualidad corresponde a <strong>ambos integrantes del matrimonio</strong> y debe entregarse una sola vez.`
    : `Cada alumno tiene la responsabilidad de entregar su pago dentro del periodo.`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
  <tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:${headerColor};">${esc(eyebrowText)}</p>
        <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#F8FAFC;">${esc(headline)}</h1>
      </td></tr>
      <tr><td style="padding:0 0 16px;font-size:16px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0 0 16px;">Hola <strong>${esc(p.firstName)}</strong>,</p>
        <p style="margin:0 0 16px;">${bodyIntro}</p>
      </td></tr>
      <tr><td style="padding:0 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;">
          <tr><td style="padding:20px 24px;font-size:14px;line-height:1.9;color:#F8FAFC;">
            <p style="margin:0;color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Detalles</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;font-size:14px;">
              <tr><td style="padding:4px 0;color:#94A3B8;width:40%;">Modalidad</td><td style="padding:4px 0;color:#F8FAFC;font-weight:600;">${p.isMarriage ? "Matrimonio" : "Individual"}</td></tr>
              <tr><td style="padding:4px 0;color:#94A3B8;">Periodo</td><td style="padding:4px 0;color:#F8FAFC;font-weight:600;">${esc(p.periodLabel)}</td></tr>
              <tr><td style="padding:4px 0;color:#94A3B8;">Recolección</td><td style="padding:4px 0;color:#F8FAFC;font-weight:600;">${p.startDay} al ${p.endDay} de ${esc(p.monthLabel)}</td></tr>
              <tr><td style="padding:4px 0;color:#94A3B8;">Monto</td><td style="padding:4px 0;color:#F8FAFC;font-weight:700;font-size:16px;">$${p.amountArs.toLocaleString("es-AR")} ARS</td></tr>
              ${p.pastorName ? `<tr><td style="padding:4px 0;color:#94A3B8;">Pastor responsable</td><td style="padding:4px 0;color:#F8FAFC;font-weight:600;">${esc(p.pastorName)}${p.pastorPhone ? ` · ${esc(p.pastorPhone)}` : ""}</td></tr>` : ""}
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 0 24px;font-size:15px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0 0 16px;">${inscriptionLine}</p>
        <p style="margin:0 0 16px;">Los pastores reunirán los pagos recibidos y realizarán la transferencia correspondiente a DAP el <strong>día 1 del mes siguiente</strong>.</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 0 32px;">
        <a href="https://www.dapglobal.org/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${headerColor},#0084D6);color:#fff;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;">Ir a mi portal →</a>
      </td></tr>
      <tr><td style="padding:0 0 24px;font-size:13px;line-height:1.7;color:#94A3B8;">
        <p style="margin:0;">Si ya realizaste el pago, podés ignorar este mensaje o enviar tu comprobante a tu pastor para su validación.</p>
      </td></tr>
      <tr><td style="padding:24px 0 0;border-top:1px solid rgba(255,255,255,0.08);font-size:15px;line-height:1.7;color:#E2E8F0;">
        <p style="margin:0;color:#F8FAFC;font-weight:600;">En honor,<br>Apóstol Max Hebeling</p>
        <p style="margin:8px 0 0;font-size:12px;color:#94A3B8;">DAP · Diplomado Apostólico Pastoral</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}
