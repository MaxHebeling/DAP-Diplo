/**
 * Cron mensual · Beca de Honor
 *
 * 1. Verifica vigencia (marca 'vencida' las que pasaron end_date; 'proxima_vencer'
 *    las que están a ≤7 días de vencer).
 * 2. Notifica por email a los alumnos con beca vigente que NO hayan sido
 *    notificados en los últimos 25 días. Idempotente: last_notified_at.
 * 3. Solo notifica si el alumno sigue activo (admission_status='approved').
 *
 * Schedule: día 22 a las 12:00 UTC (~09:00 AR) — antes de que arranque el
 * periodo de recolección para los que sí pagan.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHonorScholarshipActiveEmail } from "@/lib/email/send-honor-scholarship-active";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NOTIFY_INTERVAL_DAYS = 25;
const PROXIMA_VENCER_DAYS = 7;

type Scholarship = {
  id: string;
  user_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  last_notified_at: string | null;
};

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const soonIso = new Date(now.getTime() + PROXIMA_VENCER_DAYS * 86_400_000)
    .toISOString().slice(0, 10);
  const stats = { transitioned: 0, notified: 0, skipped: 0, errors: 0 };

  // 1. Transición 'vigente' → 'vencida' (end_date pasado)
  const { data: expired } = await admin
    .from("honor_scholarships")
    .select("id")
    .eq("status", "vigente")
    .not("end_date", "is", null)
    .lt("end_date", todayIso);
  for (const s of expired ?? []) {
    await admin.from("honor_scholarships")
      .update({ status: "vencida", updated_at: now.toISOString() })
      .eq("id", s.id);
    stats.transitioned++;
  }

  // 2. Transición 'vigente' → 'proxima_vencer' (end_date en ≤7 días)
  const { data: soon } = await admin
    .from("honor_scholarships")
    .select("id")
    .eq("status", "vigente")
    .not("end_date", "is", null)
    .gte("end_date", todayIso)
    .lte("end_date", soonIso);
  for (const s of soon ?? []) {
    await admin.from("honor_scholarships")
      .update({ status: "proxima_vencer", updated_at: now.toISOString() })
      .eq("id", s.id);
    stats.transitioned++;
  }

  // 3. Notificar becas vigentes o próximas a vencer que no fueron notificadas
  //    en los últimos NOTIFY_INTERVAL_DAYS días.
  //    Solo type='honor' (becas reales). Otros types en la misma tabla —
  //    ej. 'pastoral_mx' — son mecanismos de acceso sin cobro Stripe pero
  //    NO son becas; mandarles el email "Tu beca sigue activa" sería falso.
  const cutoff = new Date(now.getTime() - NOTIFY_INTERVAL_DAYS * 86_400_000).toISOString();
  const { data: pending } = await admin
    .from("honor_scholarships")
    .select("id, user_id, status, start_date, end_date, last_notified_at")
    .eq("scholarship_type", "honor")
    .in("status", ["vigente", "proxima_vencer"])
    .or(`last_notified_at.is.null,last_notified_at.lt.${cutoff}`)
    .returns<Scholarship[]>();

  for (const s of pending ?? []) {
    try {
      // Solo si el alumno sigue activo
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, admission_status")
        .eq("id", s.user_id)
        .maybeSingle<{ full_name: string; admission_status: string | null }>();
      if (!profile || profile.admission_status !== "approved") {
        stats.skipped++;
        continue;
      }

      const { data: au } = await admin.auth.admin.getUserById(s.user_id);
      const email = au?.user?.email;
      if (!email) { stats.skipped++; continue; }

      const r = await sendHonorScholarshipActiveEmail({
        to: email,
        fullName: profile.full_name,
        startDate: s.start_date,
        endDate: s.end_date,
      });
      if (!r.ok) { stats.errors++; console.error(`[honor-cron] email ${s.id}:`, r.error); continue; }

      await admin.from("honor_scholarships")
        .update({ last_notified_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("id", s.id);
      stats.notified++;
    } catch (e) {
      stats.errors++;
      console.error(`[honor-cron] ${s.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, ...stats });
}
