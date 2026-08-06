/**
 * Cron mensual · Bills México
 *
 * Corre el día 1 de cada mes (08:00 UTC = ~02:00 CDMX). Genera un
 * `monthly_bills` por cada alumno MX aprobado (iglesia primaria en
 * México), monto fijo $450 MXN, ventana de recolección todo el mes
 * (día 1 al último día).
 *
 * Idempotente: si el bill ya existe para (user_id, period), skippea.
 *
 * Post-insert, recalcula la remittance de todos los pastores MX para
 * que /admin/liquidaciones-mx refleje los expected_amount actualizados.
 *
 * Auth: Bearer CRON_SECRET.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  studentIdsInCountry,
  pastorIdsInCountry,
} from "@/lib/pastor/country-filters";
import { upsertPastorRemittance } from "@/lib/pastor/remittance-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MX_MONTHLY_AMOUNT = 450;
const MX_CURRENCY = "MXN";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const collectionStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const collectionEnd = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDayOfMonth(year, month),
  ).padStart(2, "0")}`;

  const stats = {
    period: `${year}-${String(month).padStart(2, "0")}`,
    candidates: 0,
    inserted: 0,
    skipped_existing: 0,
    remittances_upserted: 0,
    errors: 0,
  };

  // Alumnos MX aprobados
  const mxStudentIds = await studentIdsInCountry(admin, "México");
  stats.candidates = mxStudentIds.length;
  if (mxStudentIds.length === 0) {
    return NextResponse.json({ ok: true, ...stats, note: "no MX students" });
  }

  // Existentes en este periodo (para skip idempotente)
  const { data: existing } = await admin
    .from("monthly_bills")
    .select("user_id")
    .in("user_id", mxStudentIds)
    .eq("period_year", year)
    .eq("period_month", month);
  const alreadyBilled = new Set((existing ?? []).map((b) => b.user_id));

  const rowsToInsert = mxStudentIds
    .filter((id) => !alreadyBilled.has(id))
    .map((user_id) => ({
      user_id,
      period_year: year,
      period_month: month,
      collection_start: collectionStart,
      collection_end: collectionEnd,
      modality: "individual",
      amount_ars: MX_MONTHLY_AMOUNT,
      currency: MX_CURRENCY,
      status: "pending",
    }));

  stats.skipped_existing = alreadyBilled.size;

  if (rowsToInsert.length > 0) {
    const { error, count } = await admin
      .from("monthly_bills")
      .insert(rowsToInsert, { count: "exact" });
    if (error) {
      console.error("[mx-bills-generate] insert error:", error);
      stats.errors++;
      return NextResponse.json({ ok: false, ...stats, error: error.message }, { status: 500 });
    }
    stats.inserted = count ?? rowsToInsert.length;
  }

  // Recalcular remittance de todos los pastores MX para reflejar los
  // nuevos bills en /admin/liquidaciones-mx y /pastor/liquidacion.
  const mxPastorIds = await pastorIdsInCountry(admin, "México");
  for (const pid of mxPastorIds) {
    const r = await upsertPastorRemittance({
      pastorUserId: pid,
      year,
      month,
    });
    if (r.ok) stats.remittances_upserted++;
    else {
      stats.errors++;
      console.error(`[mx-bills-generate] remittance pastor=${pid}:`, r.error);
    }
  }

  return NextResponse.json({ ok: true, ...stats });
}
