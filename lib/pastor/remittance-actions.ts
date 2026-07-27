"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

type Result = { ok: true; remittanceId: string } | { ok: false; error: string };

/**
 * Recalcula los totales de una liquidación en base a los bills reales.
 * Se llama al crear + cuando el pastor actualiza el estado.
 */
async function recomputeTotals(admin: ReturnType<typeof createAdminClient>, pastorUserId: string, year: number, month: number): Promise<{
  individuals: number; marriages: number; peopleCovered: number; honor: number;
  expected: number; collected: number;
}> {
  // Iglesias a cargo del pastor (Ticket 2 · iglesia-first)
  const { data: myChurches } = await admin.from("church_pastors")
    .select("church_id")
    .eq("pastor_user_id", pastorUserId).eq("status", "active");
  const churchIds = (myChurches ?? []).map((c) => c.church_id);

  // Alumnos de esas iglesias — excluye al propio pastor (dual-role)
  const { data: churchStudents } = churchIds.length > 0
    ? await admin.from("profiles")
        .select("id")
        .in("church_id", churchIds)
        .eq("admission_status", "approved")
        .neq("id", pastorUserId)
    : { data: [] };
  const allStudentIds = (churchStudents ?? []).map((s) => s.id);

  // Matrimonios que involucran alumnos de mis iglesias
  const { data: pairsData } = allStudentIds.length > 0
    ? await admin.from("spousal_pairs")
        .select("id, spouse_1_user_id, spouse_2_user_id")
        .or(`spouse_1_user_id.in.(${allStudentIds.join(",")}),spouse_2_user_id.in.(${allStudentIds.join(",")})`)
    : { data: [] };
  const marriedUserIds = new Set<string>();
  const pairIds: string[] = [];
  for (const p of pairsData ?? []) {
    pairIds.push(p.id);
    marriedUserIds.add(p.spouse_1_user_id);
    marriedUserIds.add(p.spouse_2_user_id);
  }
  const studentIds = allStudentIds.filter((id) => !marriedUserIds.has(id));

  let individuals = 0, marriages = 0, expected = 0, collected = 0;

  if (studentIds.length > 0) {
    const { data: bills } = await admin.from("monthly_bills").select("amount_ars, received_amount_ars, status")
      .in("user_id", studentIds).eq("period_year", year).eq("period_month", month)
      .not("status", "in", "(exempt,canceled)");
    for (const b of bills ?? []) {
      individuals++;
      expected += b.amount_ars;
      if (b.status === "paid") collected += b.received_amount_ars ?? b.amount_ars;
    }
  }
  if (pairIds.length > 0) {
    const { data: bills } = await admin.from("monthly_bills").select("amount_ars, received_amount_ars, status")
      .in("spousal_pair_id", pairIds).eq("period_year", year).eq("period_month", month)
      .not("status", "in", "(exempt,canceled)");
    for (const b of bills ?? []) {
      marriages++;
      expected += b.amount_ars;
      if (b.status === "paid") collected += b.received_amount_ars ?? b.amount_ars;
    }
  }

  // Contar becados asignados (informativo)
  let honor = 0;
  if (studentIds.length > 0) {
    const { count } = await admin.from("honor_scholarships")
      .select("id", { count: "exact", head: true })
      .in("user_id", studentIds).in("status", ["vigente", "proxima_vencer"]);
    honor = count ?? 0;
  }

  const peopleCovered = individuals + marriages * 2 + honor;
  return { individuals, marriages, peopleCovered, honor, expected, collected };
}

/**
 * Crea o refresca liquidación para (pastor, año, mes). Idempotente.
 * transfer_date_expected = día 1 del mes SIGUIENTE.
 */
export async function upsertPastorRemittance(input: {
  pastorUserId: string;
  year: number;
  month: number;
}): Promise<Result> {
  const admin = createAdminClient();
  const { individuals, marriages, peopleCovered, honor, expected, collected } =
    await recomputeTotals(admin, input.pastorUserId, input.year, input.month);

  // día 1 del mes siguiente
  const nextMonth = input.month === 12 ? 1 : input.month + 1;
  const nextYear = input.month === 12 ? input.year + 1 : input.year;
  const transferExpected = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const { data: existing } = await admin.from("pastor_remittances")
    .select("id")
    .eq("pastor_user_id", input.pastorUserId)
    .eq("period_year", input.year).eq("period_month", input.month)
    .maybeSingle<{ id: string }>();

  const patch = {
    individuals_count: individuals,
    marriages_count: marriages,
    people_covered: peopleCovered,
    honor_scholarships_count: honor,
    expected_amount_ars: expected,
    collected_amount_ars: collected,
    transfer_date_expected: transferExpected,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Solo refrescar contadores/montos si no está ya `transferred`/`partial`/`canceled`
    const { data: existRow } = await admin.from("pastor_remittances")
      .select("status").eq("id", existing.id).single<{ status: string }>();
    if (["transferred", "partial", "canceled"].includes(existRow?.status ?? "")) {
      return { ok: true, remittanceId: existing.id };
    }
    await admin.from("pastor_remittances").update(patch).eq("id", existing.id);
    return { ok: true, remittanceId: existing.id };
  }

  const { data: created, error } = await admin.from("pastor_remittances").insert({
    pastor_user_id: input.pastorUserId,
    period_year: input.year, period_month: input.month,
    status: "pending_collection",
    ...patch,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, remittanceId: created.id };
}

/**
 * Pastor marca como "transferida a DAP". Actualiza monto transferido +
 * comprobante + observaciones + status='transferred'/'partial' según diff.
 */
export async function submitPastorRemittanceAction(input: {
  remittanceId: string;
  transferredAmountArs: number;
  transferDateActual: string;
  receiptUrl?: string;
  observations?: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada" };

  const { data: profile } = await supabase.from("profiles").select("role")
    .eq("id", user.id).maybeSingle<{ role: string }>();
  if (!profile || (profile.role !== "pastor" && profile.role !== "admin")) {
    return { ok: false, error: "Solo pastores o admin" };
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: current } = await admin.from("pastor_remittances")
    .select("id, pastor_user_id, expected_amount_ars, collected_amount_ars, status, history")
    .eq("id", input.remittanceId).maybeSingle<{
      id: string; pastor_user_id: string; expected_amount_ars: number;
      collected_amount_ars: number; status: string; history: unknown[];
    }>();
  if (!current) return { ok: false, error: "Liquidación no encontrada" };
  if (profile.role === "pastor" && current.pastor_user_id !== user.id) {
    return { ok: false, error: "No es tu liquidación" };
  }

  // Determinar status: transferred (match) | partial (menos) | needs_review (más o raro)
  let newStatus: string;
  if (input.transferredAmountArs >= current.expected_amount_ars) newStatus = "transferred";
  else if (input.transferredAmountArs > 0) newStatus = "partial";
  else newStatus = "needs_review";

  const { error } = await admin.from("pastor_remittances").update({
    transferred_amount_ars: input.transferredAmountArs,
    transfer_date_actual: input.transferDateActual,
    receipt_url: input.receiptUrl ?? null,
    observations: input.observations ?? null,
    status: newStatus,
    submitted_by: user.id,
    submitted_at: nowIso,
    updated_at: nowIso,
    history: [...(current.history ?? []), {
      at: nowIso, by: user.id, from: current.status, to: newStatus,
      transferred: input.transferredAmountArs, actual_date: input.transferDateActual,
    }],
  }).eq("id", input.remittanceId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/liquidaciones");
  revalidatePath("/pastor");
  return { ok: true, remittanceId: input.remittanceId };
}

/**
 * Admin confirma que recibió la transferencia. Cierra el circuito.
 */
export async function confirmRemittanceReceivedAction(input: {
  remittanceId: string;
  observations?: string;
}): Promise<Result> {
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { ok: false, error: "Solo admin" };

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: current } = await admin.from("pastor_remittances")
    .select("id, status, history").eq("id", input.remittanceId)
    .maybeSingle<{ id: string; status: string; history: unknown[] }>();
  if (!current) return { ok: false, error: "no encontrada" };

  const { error } = await admin.from("pastor_remittances").update({
    confirmed_by: userId,
    confirmed_at: nowIso,
    observations: input.observations ?? undefined,
    updated_at: nowIso,
    history: [...(current.history ?? []), {
      at: nowIso, by: userId, action: "admin_confirmed_received",
    }],
  }).eq("id", input.remittanceId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/liquidaciones");
  return { ok: true, remittanceId: input.remittanceId };
}
