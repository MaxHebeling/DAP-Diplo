/**
 * Cliente Resend minimalista basado en fetch directo (sin SDK).
 *
 * Razón: en serverless preferimos fetch nativo. La API de Resend es
 * simple (POST a /emails con JSON), no necesitamos el SDK.
 *
 * Las llamadas son fire-and-forget desde el webhook de Stripe:
 * si fallan se loguean pero NO interrumpen el procesado del evento
 * (el alumno ya tiene su suscripción, el email es secundario).
 */

const RESEND_API = "https://api.resend.com/emails";

export type SendEmailAttachment = {
  filename: string;
  /** Contenido base64. */
  content: string;
  /** MIME — opcional, Resend lo infiere si no se pasa. */
  contentType?: string;
};

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  /** Override del EMAIL_FROM por defecto si hace falta. */
  from?: string;
  /** Reply-To opcional. */
  replyTo?: string;
  /** Adjuntos (PDF, etc). El payload va base64-encoded en JSON. */
  attachments?: SendEmailAttachment[];
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurado" };
  }
  const from = input.from ?? process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, error: "EMAIL_FROM no configurado" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments && input.attachments.length > 0
          ? {
              attachments: input.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
      }),
    });

    const data = (await res.json()) as
      | { id: string }
      | { name?: string; message?: string; statusCode?: number };

    if (!res.ok) {
      const err = (data as { message?: string }).message ?? `HTTP ${res.status}`;
      return { ok: false, error: err };
    }
    return { ok: true, id: (data as { id: string }).id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: msg };
  }
}
