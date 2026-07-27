/**
 * Cron día 1 de cada mes a 09:00 UTC (~06:00 AR):
 *   - Crea/refresca `pastor_remittances` para el MES ANTERIOR de cada pastor
 *     con alumnos asignados.
 *   - Los pastores ven la liquidación en `/pastor/liquidacion` y confirman
 *     su transferencia a DAP.
 *
 * Idempotente: `upsertPastorRemittance` no duplica si ya existe.
 * Salta pastores sin alumnos asignados.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertPastorRemittance } from "@/lib/pastor/remittance-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  // Mes anterior (el que acaba de terminar)
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const { data: pastors } = await admin.from("profiles")
    .select("id, full_name").eq("role", "pastor");
  const stats = { total: pastors?.length ?? 0, upserted: 0, skipped: 0, errors: 0 };

  for (const p of pastors ?? []) {
    // Verifica si tiene alumnos asignados
    const { count } = await admin.from("pastor_assignments")
      .select("id", { count: "exact", head: true })
      .eq("pastor_user_id", p.id).eq("status", "active");
    if ((count ?? 0) === 0) { stats.skipped++; continue; }

    const r = await upsertPastorRemittance({ pastorUserId: p.id, year: prevYear, month: prevMonth });
    if (r.ok) stats.upserted++;
    else { stats.errors++; console.error(`[remittance-cron] pastor=${p.id}: ${r.error}`); }
  }

  return NextResponse.json({ ok: true, period: `${prevYear}-${prevMonth}`, ...stats });
}
