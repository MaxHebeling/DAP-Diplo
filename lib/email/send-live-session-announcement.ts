import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  LIVE_KIND_LABEL,
  type LiveKind,
} from "@/lib/live-sessions/schemas";

type AnnouncementInput = {
  id: string;
  kind: LiveKind;
  title: string;
  description: string | null;
  scheduledAt: Date;
  hostName: string | null;
};

type Recipient = {
  email: string;
  full_name: string;
};

/**
 * Notifica a todos los suscriptores activos cuando admin crea una sesión
 * nueva (MasterClass / mentoría / evento especial).
 *
 * Comportamiento:
 *  - Carga emails de auth.users de profiles con suscripción activa.
 *  - Envía emails en lotes (Resend permite array en `to` pero pone a
 *    todos los destinatarios visibles si va en TO; usamos uno por
 *    request individual para preservar privacidad).
 *  - Fire-and-forget desde el caller (no bloquear el redirect). Si una
 *    falla, log + sigue. No relanza.
 *
 * NOTA: para 1000+ alumnos esto debería migrar a una cola
 * (Vercel Queue / Supabase Edge Function). Por ahora con < 200 alumnos
 * está OK procesarlo inline.
 */
export async function broadcastLiveSessionAnnouncement(
  input: AnnouncementInput,
): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();

  // Suscriptores activos
  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);

  if (error || !subs || subs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const userIds = subs.map((s) => s.user_id);

  // Filtramos a alumnos con admisión aprobada (no notificamos a alumnos
  // en estado pending — todavía no pueden entrar).
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, admission_status")
    .in("id", userIds)
    .eq("admission_status", "approved");

  if (!profiles || profiles.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Emails desde auth.users (no en profiles, pq la app usa email-link)
  const { data: authUsers } = await admin.rpc("get_users_emails_by_ids", {
    p_ids: profiles.map((p) => p.id),
  });

  const emailById = new Map<string, string>();
  if (Array.isArray(authUsers)) {
    for (const u of authUsers as Array<{ id: string; email: string }>) {
      if (u?.id && u?.email) emailById.set(u.id, u.email);
    }
  }

  const recipients: Recipient[] = profiles
    .map((p) => ({
      email: emailById.get(p.id) ?? "",
      full_name: p.full_name,
    }))
    .filter((r) => r.email);

  if (recipients.length === 0) return { sent: 0, failed: 0 };

  const html = render(input);
  const subject = subjectFor(input);

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const res = await sendEmail({
      to: r.email,
      subject,
      html,
    });
    if (res.ok) sent++;
    else {
      failed++;
      console.error(
        `[live-announcement] email a ${r.email} falló: ${res.error}`,
      );
    }
  }

  return { sent, failed };
}

function subjectFor(input: AnnouncementInput): string {
  const label = LIVE_KIND_LABEL[input.kind];
  return `Nueva ${label}: ${input.title}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(p: AnnouncementInput): string {
  const label = LIVE_KIND_LABEL[p.kind];
  const dateStr = p.scheduledAt.toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Los_Angeles",
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(label)}: ${esc(p.title)}</title>
</head>
<body style="margin:0;padding:0;background:#07142B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07142B;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 28px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#FF4D6D;">
            DAP · Nueva sesión en vivo
          </p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;">
            ${esc(label)}: ${esc(p.title)}
          </h1>
        </td></tr>

        <tr><td style="padding:0 0 16px;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#E2E8F0;">
            <strong>${esc(dateStr)}</strong>
            ${p.hostName ? `<br>Conduce: ${esc(p.hostName)}` : ""}
          </p>
        </td></tr>

        ${
          p.description
            ? `<tr><td style="padding:8px 0;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#CBD5E1;">
                ${esc(p.description)}
              </p>
            </td></tr>`
            : ""
        }

        <tr><td align="center" style="padding:32px 0 0;">
          <a href="${esc(appUrl)}/en-vivo"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7B61FF 0%,#FF4D6D 100%);color:#fff;font-weight:600;text-decoration:none;border-radius:8px;font-size:14px;">
            Ver detalles y unirme →
          </a>
        </td></tr>

        <tr><td align="center" style="padding:24px 0 0;">
          <p style="margin:0;font-size:11px;color:#64748B;">
            Recibirás también un recordatorio 1 hora antes.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
