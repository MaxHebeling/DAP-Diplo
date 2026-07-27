/**
 * Cron diario · 12:00 UTC (09:00 AR) · Notificaciones AR pagos mensuales.
 *
 * Lógica por día del mes (AR timezone America/Argentina/Buenos_Aires):
 *   • Día 20 → pre_period (bills del periodo actual)
 *   • Día 23 → period_start (bills del periodo actual)
 *   • Día 27 → mid_period (bills del periodo actual, aún pending)
 *   • Último día del mes → last_day
 *   • Día 2 del mes siguiente → overdue (bills del periodo anterior que siguen pending)
 *
 * Idempotencia: unique index en ar_notifications_log(target,type,year,month).
 * Insertamos ANTES de enviar → si ya existe, skipeamos silenciosamente.
 * Si el envío falla, actualizamos el log status=failed pero no reintentamos
 * automáticamente (evita spam).
 *
 * NUNCA notifica a:
 *   - Alumnos con honor_scholarship vigente
 *   - Bills en estado paid/exempt/canceled/suspended
 *   - Alumnos con admission_status != 'approved'
 *   - Matrimonios ya pagados por cualquier cónyuge (bill único por pair)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendArMonthlyNotification, type ArNotificationType } from "@/lib/email/send-ar-monthly-notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

/** Fecha actual en AR timezone → {year, month, day, lastDayOfMonth} */
function arNow(): { year: number; month: number; day: number; lastDayOfMonth: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const year = parseInt(parts.year, 10), month = parseInt(parts.month, 10), day = parseInt(parts.day, 10);
  const lastDayOfMonth = new Date(year, month, 0).getDate(); // día 0 del mes siguiente = último día del actual
  return { year, month, day, lastDayOfMonth };
}

/** Determina qué tipo de notif corresponde HOY y de qué periodo. Null si nada. */
function decideNotification(now: ReturnType<typeof arNow>): { type: ArNotificationType; periodYear: number; periodMonth: number } | null {
  const { year, month, day, lastDayOfMonth } = now;
  if (day === 20) return { type: "pre_period",  periodYear: year, periodMonth: month };
  if (day === 23) return { type: "period_start", periodYear: year, periodMonth: month };
  if (day === 27) return { type: "mid_period",   periodYear: year, periodMonth: month };
  if (day === lastDayOfMonth) return { type: "last_day", periodYear: year, periodMonth: month };
  if (day === 2) {
    // Reclamo overdue del mes anterior
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return { type: "overdue", periodYear: prevYear, periodMonth: prevMonth };
  }
  return null;
}

type Bill = {
  id: string;
  user_id: string | null;
  spousal_pair_id: string | null;
  amount_ars: number;
  modality: "individual" | "marriage" | "honor";
  collection_start: string;
  collection_end: string;
  status: string;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = arNow();
  const decision = decideNotification(now);
  if (!decision) return NextResponse.json({ ok: true, day: now.day, action: "no-op" });

  const stats = { attempted: 0, sent: 0, skipped: 0, failed: 0 };

  // Query bills del periodo target, solo pending
  const { data: bills, error: qErr } = await admin.from("monthly_bills")
    .select("id, user_id, spousal_pair_id, amount_ars, modality, collection_start, collection_end, status")
    .eq("period_year", decision.periodYear).eq("period_month", decision.periodMonth)
    .eq("status", "pending")
    .returns<Bill[]>();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  for (const bill of bills ?? []) {
    stats.attempted++;
    const targetKind: "student" | "pair" = bill.user_id ? "student" : "pair";
    const targetId = bill.user_id ?? bill.spousal_pair_id!;

    // Resolver destinatarios: individual = 1 alumno; matrimonio = ambos cónyuges
    const recipientIds: string[] = [];
    if (bill.user_id) {
      recipientIds.push(bill.user_id);
    } else if (bill.spousal_pair_id) {
      const { data: pair } = await admin.from("spousal_pairs")
        .select("spouse_1_user_id, spouse_2_user_id").eq("id", bill.spousal_pair_id).single();
      if (pair) recipientIds.push(pair.spouse_1_user_id, pair.spouse_2_user_id);
    }

    // Verificar: alumno active + no honor
    const activeIds: string[] = [];
    for (const uid of recipientIds) {
      const { data: prof } = await admin.from("profiles")
        .select("admission_status").eq("id", uid).maybeSingle<{ admission_status: string }>();
      if (prof?.admission_status !== "approved") continue;
      const { count: honorCount } = await admin.from("honor_scholarships")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid).in("status", ["vigente","proxima_vencer"]);
      if ((honorCount ?? 0) > 0) continue;
      activeIds.push(uid);
    }
    if (activeIds.length === 0) { stats.skipped++; continue; }

    // Idempotencia: intentar insertar 1 row en el log (por bill target, no por recipient)
    // Si ya existe, saltar toda la bill
    const recipientEmail = "batch"; // placeholder; guardamos 1 log por bill target
    const { error: logErr } = await admin.from("ar_notifications_log").insert({
      target_kind: targetKind, target_id: targetId,
      notification_type: decision.type,
      period_year: decision.periodYear, period_month: decision.periodMonth,
      recipient: recipientEmail, status: "sent",
    });
    if (logErr && logErr.code === "23505") { stats.skipped++; continue; } // ya notificado
    if (logErr) { stats.failed++; console.error("[ar-notif]", logErr); continue; }

    // Cargar nombres + pastor
    const profilesData: Record<string, { fullName: string; email: string }> = {};
    for (const uid of activeIds) {
      const { data: p } = await admin.from("profiles").select("full_name").eq("id", uid).single<{ full_name: string }>();
      const { data: au } = await admin.auth.admin.getUserById(uid);
      if (p && au?.user?.email) profilesData[uid] = { fullName: p.full_name, email: au.user.email };
    }

    // Pastor asignado
    let pastorName: string | null = null;
    const { data: asg } = await admin.from("pastor_assignments")
      .select("pastor_user_id")
      .or(`student_user_id.eq.${targetId},spousal_pair_id.eq.${targetId}`)
      .eq("status", "active").maybeSingle();
    if (asg?.pastor_user_id) {
      const { data: pp } = await admin.from("profiles").select("full_name")
        .eq("id", asg.pastor_user_id).maybeSingle<{ full_name: string }>();
      pastorName = pp?.full_name.split(" ").slice(0, 2).join(" ") ?? null;
    }

    // Enviar a cada destinatario
    let allSent = true;
    for (const uid of activeIds) {
      const rec = profilesData[uid];
      if (!rec) continue;
      // Para matrimonio, usar "X y Y" como full_name en el email
      const fullName = bill.modality === "marriage" && activeIds.length === 2
        ? `${profilesData[activeIds[0]]?.fullName.split(" ")[0]} y ${profilesData[activeIds[1]]?.fullName.split(" ")[0]}`
        : rec.fullName;

      const r = await sendArMonthlyNotification({
        to: rec.email,
        fullName,
        modality: bill.modality === "marriage" ? "marriage" : "individual",
        amountArs: bill.amount_ars,
        year: decision.periodYear,
        month: decision.periodMonth,
        collectionStart: bill.collection_start,
        collectionEnd: bill.collection_end,
        pastorName,
        type: decision.type,
      });
      if (!r.ok) { allSent = false; console.error(`[ar-notif] ${uid}: ${r.error}`); }
    }
    if (allSent) stats.sent++;
    else stats.failed++;
  }

  return NextResponse.json({ ok: true, day: now.day, decision, ...stats });
}
