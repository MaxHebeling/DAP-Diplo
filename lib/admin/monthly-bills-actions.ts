"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true; billId: string } | { ok: false; error: string };

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
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!isAdmin || !userId) return { ok: false, error: "Solo admin" };
  if (!input.billId) return { ok: false, error: "billId requerido" };
  if (input.receivedAmountArs < 0) return { ok: false, error: "monto inválido" };

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
      pastor_receiver_user_id: input.pastorReceiverUserId ?? null,
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
