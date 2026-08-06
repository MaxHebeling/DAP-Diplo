"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertCircle, X, Loader2, User, Users, Star } from "lucide-react";
import { markBillPaidAction, markBillExemptAction, revertBillToPendingAction } from "@/lib/admin/monthly-bills-actions";
import { assignPastorAction } from "@/lib/admin/pastor-assignment-actions";
import { formatMoney, formatMoneyBare } from "@/lib/format/money";

type Bill = {
  id: string;
  modality: "individual" | "marriage" | "honor";
  amount_ars: number;
  status: "pending" | "paid" | "overdue" | "exempt" | "canceled" | "suspended";
  paid_at: string | null;
  payment_method: string | null;
  received_amount_ars: number | null;
  observations: string | null;
  currency: string;
};

type Pastor = { id: string; full_name: string };

export function BillRow({ bill, label, pastors, currentPastorId, targetKind, targetId }: {
  bill: Bill;
  label: string;
  pastors: Pastor[];
  currentPastorId?: string;
  targetKind: "student" | "pair";
  targetId: string;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState<null | "paid" | "exempt" | "revert">(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState("efectivo_pastor");
  const [amount, setAmount] = useState(String(bill.amount_ars));
  const [reason, setReason] = useState("");

  const statusStyle = {
    paid: "border-emerald-500/40 bg-emerald-500/[0.06]",
    pending: "border-amber-500/40 bg-amber-500/[0.06]",
    overdue: "border-red-500/40 bg-red-500/[0.06]",
    exempt: "border-slate-500/40 bg-slate-500/[0.06]",
    canceled: "border-slate-500/40 bg-slate-500/[0.03]",
    suspended: "border-slate-500/40 bg-slate-500/[0.03]",
  }[bill.status];

  const statusLabel = {
    paid: "✓ Pagada", pending: "Pendiente", overdue: "Vencida",
    exempt: "Exonerada", canceled: "Cancelada", suspended: "Suspendida",
  }[bill.status];

  const modalityIcon = bill.modality === "marriage" ? <Users className="size-4" /> :
    bill.modality === "honor" ? <Star className="size-4" /> : <User className="size-4" />;
  const modalityLabel = bill.modality === "marriage" ? "Matrimonio" :
    bill.modality === "honor" ? "Beca" : "Individual";

  function doAction(type: "paid" | "exempt" | "revert") {
    startTransition(async () => {
      let res;
      if (type === "paid") {
        res = await markBillPaidAction({
          billId: bill.id, paymentMethod: method, receivedAmountArs: parseInt(amount, 10),
          observations: reason || undefined,
        });
      } else if (type === "exempt") {
        res = await markBillExemptAction({ billId: bill.id, reason });
      } else {
        res = await revertBillToPendingAction({ billId: bill.id, reason });
      }
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Actualizado");
      setModalOpen(null);
      router.refresh();
    });
  }

  function assignPastor(newPastorId: string) {
    if (!newPastorId || newPastorId === currentPastorId) return;
    startTransition(async () => {
      const res = await assignPastorAction({ targetKind, targetId, pastorUserId: newPastorId });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Pastor asignado");
      router.refresh();
    });
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${statusStyle}`}>
        <div className="flex items-center gap-2">
          {modalityIcon}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {modalityLabel}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{label}</p>
          {bill.paid_at && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pagó {new Date(bill.paid_at).toLocaleDateString("es-AR")} · {bill.payment_method}
              {bill.received_amount_ars && ` · ${formatMoneyBare(bill.received_amount_ars, bill.currency)}`}
            </p>
          )}
        </div>
        <select
          value={currentPastorId ?? ""}
          onChange={(e) => assignPastor(e.target.value)}
          disabled={pending}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs disabled:opacity-50"
        >
          <option value="">— Sin pastor —</option>
          {pastors.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name.split(" ").slice(0, 2).join(" ")}</option>
          ))}
        </select>
        <div className="text-right">
          <p className="font-mono text-sm">{formatMoney(bill.amount_ars, bill.currency)}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest">{statusLabel}</p>
        </div>
        <div className="flex gap-2">
          {bill.status === "pending" && (
            <>
              <button onClick={() => setModalOpen("paid")}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20">
                <CheckCircle2 className="size-3" /> Pagó
              </button>
              <button onClick={() => setModalOpen("exempt")}
                className="inline-flex items-center gap-1 rounded-md border border-slate-500/30 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/20">
                Exonerar
              </button>
            </>
          )}
          {bill.status === "paid" && (
            <button onClick={() => setModalOpen("revert")}
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20">
              Revertir
            </button>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">
                {modalOpen === "paid" && "Registrar pago"}
                {modalOpen === "exempt" && "Exonerar mensualidad"}
                {modalOpen === "revert" && "Revertir a pendiente"}
              </h3>
              <button onClick={() => setModalOpen(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{label}</p>

            {modalOpen === "paid" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Método</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <option value="efectivo_pastor">Efectivo al pastor</option>
                    <option value="transferencia_pastor">Transferencia al pastor</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Monto recibido ({bill.currency})
                  </label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Observaciones (opcional)</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
              </div>
            )}
            {(modalOpen === "exempt" || modalOpen === "revert") && (
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Razón (mín 5 chars)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder={modalOpen === "exempt" ? "Ej: pagó adelantado en efectivo directo a DAP" : "Ej: registrado por error"} />
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalOpen(null)}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
              <button onClick={() => doAction(modalOpen)} disabled={pending}
                className="inline-flex items-center gap-2 rounded-md bg-brand-violet px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
