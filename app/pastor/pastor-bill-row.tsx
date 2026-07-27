"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import { markBillPaidAction } from "@/lib/admin/monthly-bills-actions";

type Bill = {
  id: string;
  amount_ars: number;
  received_amount_ars: number | null;
  status: "pending" | "paid" | "overdue" | "exempt" | "canceled" | "suspended";
  paid_at: string | null;
  payment_method: string | null;
};

/**
 * Row del portal pastor. Solo permite "Registrar pago" (no exonerar ni revertir —
 * eso queda como admin action).
 */
export function PastorBillRow({ bill, label }: { bill: Bill; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState("efectivo_pastor");
  const [amount, setAmount] = useState(String(bill.amount_ars));
  const [obs, setObs] = useState("");

  const isPaid = bill.status === "paid";
  const rowStyle = isPaid ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-amber-500/30 bg-amber-500/[0.04]";

  function submit() {
    startTransition(async () => {
      const res = await markBillPaidAction({
        billId: bill.id,
        paymentMethod: method,
        receivedAmountArs: parseInt(amount, 10),
        observations: obs || undefined,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Pago registrado: ${label}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${rowStyle}`}>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{label}</p>
          {isPaid && (
            <p className="mt-0.5 text-xs text-emerald-400">
              ✓ Pagó {new Date(bill.paid_at!).toLocaleDateString("es-AR")} · {bill.payment_method}
              {bill.received_amount_ars && ` · $${bill.received_amount_ars.toLocaleString("es-AR")}`}
            </p>
          )}
        </div>
        <p className="font-mono text-sm">${bill.amount_ars.toLocaleString("es-AR")}</p>
        {!isPaid && (
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20">
            <CheckCircle2 className="size-3" /> Registrar pago
          </button>
        )}
        {isPaid && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
            Pagado
          </span>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">Registrar pago</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground"><X className="size-5" /></button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{label}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Método</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="efectivo_pastor">Efectivo (me pagó en mano)</option>
                  <option value="transferencia_pastor">Transferencia a mí</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Monto recibido (ARS)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Observaciones (opcional)</label>
                <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={submit} disabled={pending}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
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
