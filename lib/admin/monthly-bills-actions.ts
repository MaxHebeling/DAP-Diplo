"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true; billId: string } | { ok: false; error: string };

/**
 * Autoriza a admin OR a un pastor de la iglesia del bill.
 * Retorna { ok, userId, isAdmin } o { ok: false, error }.
 */
async function authorizeBillAction(billId: string): Promise<
  | { ok: true; userId: string; isAdmin: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (prof?.role === "admin") return { ok: true, userId: user.id, isAdmin: true };

  // No es admin → chequear si es pastor de la iglesia del bill
  const { data: bill } = await admin
    .from("monthly_bills")
    .select("user_id, spousal_pair_id")
    .eq("id", billId)
    .maybeSingle<{ user_id: string | null; spousal_pair_id: string | null }>();
  if (!bill) return { ok: false, error: "bill no encontrada" };

  const targetUserIds: string[] = [];
  if (bill.user_id) targetUserIds.push(bill.user_id);
  if (bill.spousal_pair_id) {
    const { data: pair } = await admin
      .from("spousal_pairs")
      .select("spouse_1_user_id, spouse_2_user_id")
      .eq("id", bill.spousal_pair_id)
      .maybeSingle<{ spouse_1_user_id: string; spouse_2_user_id: string }>();
    if (pair) {
      targetUserIds.push(pair.spouse_1_user_id, pair.spouse_2_user_id);
    }
  }
  if (targetUserIds.length === 0) return { ok: false, error: "bill sin usuarios asociados" };

  const { data: targets } = await admin
    .from("profiles")
    .select("church_id")
    .in("id", targetUserIds);
  const targetChurches = new Set(
    (targets ?? []).map((p) => p.church_id).filter((c): c is string => !!c),
  );

  const { data: myChurches } = await admin
    .from("church_pastors")
    .select("church_id")
    .eq("pastor_user_id", user.id)
    .eq("status", "active");
  const myChurchIds = new Set((myChurches ?? []).map((c) => c.church_id));

  const authorized = Array.from(targetChurches).some((c) => myChurchIds.has(c));
  if (!authorized) return { ok: false, error: "No autorizado para este bill" };

  return { ok: true, userId: user.id, isAdmin: false };
}

/**
 * Marcar un bill como pagado. Registra:
 *   - método de pago (efectivo, transferencia, etc.)
 *   - monto realmente recibido (puede diferir del esperado)
 *   - pastor que recibió (opcional en Fase 3, obligatorio en Fase 4)
 *   - comprobante URL (opcional)
 *   - observaciones
 * Actualiza `confirmed_by` = admin actual y `confirmed_at` = ahora.
 * Idempotente: si ya está `paid`, retorna ok (no re-registra).
 */
export async function markBillPaidAction(input: {
  billId: string;
  paymentMethod: string;
  receivedAmountArs: number;
  pastorReceiverUserId?: string;
  receiptUrl?: string;
  observations?: string;
}): Promise<Result> {
  if (!input.billId) return { ok: false, error: "billId requerido" };
  if (input.receivedAmountArs < 0) return { ok: false, error: "monto inválido" };

  // Autorización: admin O pastor de la iglesia del alumno del bill
  const auth = await authorizeBillAction(input.billId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const userId = auth.userId;
  // Si el que registra el pago es un pastor (no admin), lo guardamos
  // como pastor_receiver_user_id para trazabilidad de quién cobró.
  const pastorReceiverUserId =
    input.pastorReceiverUserId ?? (!auth.isAdmin ? userId : null);

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Cargar bill actual (para append al history)
  const { data: current } = await admin
    .from("monthly_bills")
    .select("id, status, history")
    .eq("id", input.billId)
    .maybeSingle<{ id: string; status: string; history: unknown[] }>();
  if (!current) return { ok: false, error: "bill no encontrada" };
  if (current.status === "paid") return { ok: true, billId: current.id };

  const newHistoryEntry = {
    at: nowIso,
    by: userId,
    from: current.status,
    to: "paid",
    method: input.paymentMethod,
    amount: input.receivedAmountArs,
  };

  const { error } = await admin
    .from("monthly_bills")
    .update({
      status: "paid",
      paid_at: nowIso,
      payment_method: input.paymentMethod,
      received_amount_ars: input.receivedAmountArs,
      pastor_receiver_user_id: pastorReceiverUserId,
      payment_receipt_url: input.receiptUrl ?? null,
      observations: input.observations ?? null,
      confirmed_by: userId,
      confirmed_at: nowIso,
      updated_at: nowIso,
      history: [...(current.history ?? []), newHistoryEntry],
    })
    .eq("id", input.billId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/pagos-ar");
  revalidatePath("/pastor");
  return { ok: true, billId: input.billId };
}

/**
 * Marcar como exonerado (exempt) — pagó de otra forma o caso especial.
 * NO cuenta como deuda ni como pago cobrado.
 */
export async function markBillExemptAction(input: {
  billId: string;
  reason: string;
}): Promise<Result> {
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { ok: false, error: "Solo admin" };
  if (!input.reason || input.reason.trim().length < 5) return { ok: false, error: "razón requerida (min 5 chars)" };

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: current } = await admin.from("monthly_bills")
    .select("id, status, history").eq("id", input.billId)
    .maybeSingle<{ id: string; status: string; history: unknown[] }>();
  if (!current) return { ok: false, error: "no encontrada" };

  const { error } = await admin.from("monthly_bills").update({
    status: "exempt",
    observations: input.reason,
    confirmed_by: userId,
    confirmed_at: nowIso,
    updated_at: nowIso,
    history: [...(current.history ?? []), {
      at: nowIso, by: userId, from: current.status, to: "exempt", reason: input.reason,
    }],
  }).eq("id", input.billId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/pagos-ar");
  return { ok: true, billId: input.billId };
}

/**
 * Revertir una bill paid/exempt/canceled → pending (corrección admin).
 */
export async function revertBillToPendingAction(input: {
  billId: string;
  reason: string;
}): Promise<Result> {
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { ok: false, error: "Solo admin" };
  if (!input.reason || input.reason.trim().length < 5) return { ok: false, error: "razón requerida" };

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: current } = await admin.from("monthly_bills")
    .select("id, status, history").eq("id", input.billId)
    .maybeSingle<{ id: string; status: string; history: unknown[] }>();
  if (!current) return { ok: false, error: "no encontrada" };

  const { error } = await admin.from("monthly_bills").update({
    status: "pending",
    paid_at: null,
    payment_method: null,
    received_amount_ars: null,
    pastor_receiver_user_id: null,
    payment_receipt_url: null,
    confirmed_by: userId,
    confirmed_at: nowIso,
    updated_at: nowIso,
    history: [...(current.history ?? []), {
      at: nowIso, by: userId, from: current.status, to: "pending", reason: input.reason,
    }],
  }).eq("id", input.billId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/pagos-ar");
  return { ok: true, billId: input.billId };
}
