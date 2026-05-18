import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendSessionReminderEmail,
  type ReminderRecipient,
  type ReminderSession,
} from "@/lib/email/send-session-reminder";
import type { LiveKind } from "@/lib/live-sessions/schemas";

export const runtime = "nodejs";
// El cron corre cada 15 min — un solo invocador, no hace falta cachear.
export const dynamic = "force-dynamic";

// Vercel Cron firma sus requests con header `Authorization: Bearer ${CRON_SECRET}`
// si CRON_SECRET está configurado. Bloqueamos cualquier otro caller para que el
// endpoint no sea públicamente disparable (evita spam de emails).
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Sin secret configurado, dejamos pasar SOLO en preview/dev. En prod
    // forzamos rechazo (operador debe configurarlo). Esto es defense-in-depth.
    return process.env.VERCEL_ENV !== "production";
  }
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1) Encuentra sesiones que arrancan en [+45min, +75min] y no han enviado
  //    recordatorio todavía. El cron corre cada 15 min y la ventana es 30 min,
  //    así que cubre todas las sesiones aunque haya retraso de un tick.
  const nowMs = Date.now();
  const winStart = new Date(nowMs + 45 * 60_000).toISOString();
  const winEnd = new Date(nowMs + 75 * 60_000).toISOString();

  const { data: sessions, error: sErr } = await admin
    .from("live_sessions")
    .select(
      "id, kind, title, description, scheduled_at, duration_minutes, meeting_url, host_name",
    )
    .is("reminder_sent_at", null)
    .gte("scheduled_at", winStart)
    .lte("scheduled_at", winEnd);
  if (sErr) {
    console.error("[cron.live-reminders] sessions query failed:", sErr.message);
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  type SessionRow = {
    id: string;
    kind: LiveKind;
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    meeting_url: string;
    host_name: string | null;
  };
  const sessionsList = (sessions ?? []) as SessionRow[];
  if (sessionsList.length === 0) {
    return NextResponse.json({
      ok: true,
      sessions_processed: 0,
      window: { start: winStart, end: winEnd },
    });
  }

  // 2) Cargar suscriptores activos (mirror exacto de has_active_subscription)
  const { data: subs, error: subErr } = await admin
    .from("subscriptions")
    .select("user_id, status, current_period_end")
    .in("status", ["active", "trialing"]);
  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }
  const nowIso = new Date().toISOString();
  const activeUserIds = (subs ?? [])
    .filter(
      (s) =>
        s.current_period_end === null || s.current_period_end > nowIso,
    )
    .map((s) => s.user_id);

  if (activeUserIds.length === 0) {
    // Marca como enviado igualmente para no reintentar la misma sesión vacía.
    await admin
      .from("live_sessions")
      .update({ reminder_sent_at: new Date().toISOString() })
      .in(
        "id",
        sessionsList.map((s) => s.id),
      );
    return NextResponse.json({
      ok: true,
      sessions_processed: sessionsList.length,
      recipients: 0,
      note: "No active subscribers; reminders marked as sent.",
    });
  }

  // 3) Cargar profiles + emails de cada suscriptor
  //    profiles.full_name + auth.users.email vienen por separado.
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", activeUserIds);
  const fullNameById = new Map<string, string>(
    (profilesData ?? []).map((p) => [p.id, p.full_name ?? "Pastor"]),
  );

  // listUsers no acepta filtro por id; tenemos que paginar y filtrar
  // localmente. Para una base pequeña esto es OK.
  const recipients: ReminderRecipient[] = [];
  for (const userId of activeUserIds) {
    const { data: userData, error: uErr } =
      await admin.auth.admin.getUserById(userId);
    if (uErr || !userData.user?.email) continue;
    const fullName = fullNameById.get(userId) ?? "Pastor";
    recipients.push({
      email: userData.user.email,
      firstName: fullName.split(" ")[0] ?? "Pastor",
    });
  }

  // 4) Para cada sesión: marca reminder_sent_at PRIMERO (idempotencia
  //    pesimista) y luego envía a todos los recipients. Si dos cron ticks
  //    se solapan, el segundo no encuentra sessions sin reminder_sent_at
  //    porque ya las marcamos.
  let totalSent = 0;
  let totalFailed = 0;
  const perSession: Record<string, { sent: number; failed: number }> = {};

  for (const session of sessionsList) {
    // Marcar como procesada antes de mandar emails (evita race con próximo tick).
    const { error: markErr } = await admin
      .from("live_sessions")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", session.id)
      .is("reminder_sent_at", null);
    if (markErr) {
      console.error(
        `[cron.live-reminders] no se pudo marcar sesión ${session.id}:`,
        markErr.message,
      );
      // Si no podemos marcar, no enviamos para evitar duplicados.
      continue;
    }

    const sessionPayload: ReminderSession = {
      id: session.id,
      kind: session.kind,
      title: session.title,
      description: session.description,
      scheduled_at: session.scheduled_at,
      duration_minutes: session.duration_minutes,
      meeting_url: session.meeting_url,
      host_name: session.host_name,
    };

    let sent = 0;
    let failed = 0;
    // Secuencial para no saturar Resend (free tier rate-limit).
    for (const r of recipients) {
      const res = await sendSessionReminderEmail(r, sessionPayload);
      if (res.ok) sent++;
      else {
        failed++;
        console.error(
          `[cron.live-reminders] email a ${r.email} (sesión ${session.id}) falló:`,
          res.error,
        );
      }
    }
    perSession[session.id] = { sent, failed };
    totalSent += sent;
    totalFailed += failed;
  }

  return NextResponse.json({
    ok: true,
    sessions_processed: sessionsList.length,
    recipients: recipients.length,
    total_emails_sent: totalSent,
    total_emails_failed: totalFailed,
    per_session: perSession,
    window: { start: winStart, end: winEnd },
  });
}
