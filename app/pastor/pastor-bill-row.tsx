"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, X, Loader2, User, Users, Star } from "lucide-react";
import { markBillPaidAction } from "@/lib/admin/monthly-bills-actions";

type Bill = {
  id: string;
  amount_ars: number;
  received_amount_ars: number | null;
  status: "pending" | "paid" | "overdue" | "exempt" | "canceled" | "suspended";
  paid_at: string | null;
  payment_method: string | null;
};

type Modality = "individual" | "marriage" | "honor";

/**
 * Row unificada del portal pastor. Muestra badge claro de modalidad
 * (individual / matrimonio / beca), monto, estado, y botón para
 * registrar pago (excepto beca — está exenta).
 */
export function PastorBillRow({
  bill,
  label,
  modality,
}: {
  bill: Bill | null; // null → beca (sin bill asociada)
  label: string;
  modality: Modality;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState("efectivo_pastor");
  const [amount, setAmount] = useState(bill ? String(bill.amount_ars) : "0");
  const [obs, setObs] = useState("");

  const isHonor = modality === "honor";
  const isPaid = bill?.status === "paid";
  const rowStyle = isHonor
    ? "border-amber-500/30 bg-amber-500/[0.04]"
    : isPaid
      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
      : "border-white/[0.1] bg-white/[0.02]";

  function submit() {
    if (!bill) return;
    startTransition(async () => {
      const res = await markBillPaidAction({
        billId: bill.id,
        paymentMethod: method,
        receivedAmountArs: parseInt(amount, 10),
        observations: obs || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Pago registrado: ${label}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${rowStyle}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{label}</p>
            <ModalityBadge modality={modality} />
          </div>
          {isPaid && bill && (
            <p className="mt-1 text-xs text-emerald-400">
              ✓ Pagó {new Date(bill.paid_at!).toLocaleDateString("es-AR")} · {bill.payment_method}
              {bill.received_amount_ars && ` · $${bill.received_amount_ars.toLocaleString("es-AR")}`}
            </p>
          )}
          {isHonor && (
            <p className="mt-1 text-xs text-amber-300/80">
              Liberado de pagos mientras su beca esté vigente.
            </p>
          )}
        </div>

        {!isHonor && bill && (
          <p className="font-mono text-sm">${bill.amount_ars.toLocaleString("es-AR")}</p>
        )}

        {!isHonor && !isPaid && bill && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
          >
            <CheckCircle2 className="size-3" /> Registrar pago
          </button>
        )}

        {isPaid && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
            Pagado
          </span>
        )}

        {isHonor && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
            Exento
          </span>
        )}
      </div>

      {open && bill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">Registrar pago</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-1 text-sm font-medium">{label}</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Modalidad: {modalityLabel(modality)} · Monto esperado: ${bill.amount_ars.toLocaleString("es-AR")}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Método</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="efectivo_pastor">Efectivo (me pagó en mano)</option>
                  <option value="transferencia_pastor">Transferencia a mí</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Monto recibido (ARS)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-muted-foreground">Observaciones (opcional)</label>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModalityBadge({ modality }: { modality: Modality }) {
  if (modality === "individual") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
        <User className="size-2.5" /> Individual
      </span>
    );
  }
  if (modality === "marriage") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-400">
        <Users className="size-2.5" /> Matrimonio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
      <Star className="size-2.5" /> Beca de Honor
    </span>
  );
}

function modalityLabel(m: Modality): string {
  return m === "individual" ? "Individual" : m === "marriage" ? "Matrimonio" : "Beca de Honor";
}
