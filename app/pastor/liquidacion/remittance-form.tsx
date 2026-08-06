"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitPastorRemittanceAction } from "@/lib/pastor/remittance-actions";
import { formatMoneyBare } from "@/lib/format/money";

export function RemittanceForm({
  remittanceId, expectedAmount, collectedAmount, submittedAt, transferredAmount,
  currency,
}: {
  remittanceId: string;
  expectedAmount: number;
  collectedAmount: number;
  submittedAt: string | null;
  transferredAmount: number | null;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(transferredAmount ?? collectedAmount));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState("");
  const [obs, setObs] = useState("");

  function submit() {
    const n = parseInt(amount, 10);
    if (isNaN(n) || n < 0) { toast.error("Monto inválido"); return; }
    startTransition(async () => {
      const res = await submitPastorRemittanceAction({
        remittanceId,
        transferredAmountArs: n,
        transferDateActual: date,
        receiptUrl: receiptUrl || undefined,
        observations: obs || undefined,
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Liquidación enviada. Un admin va a confirmar la recepción.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-brand-coral">
        {submittedAt ? "Actualizar transferencia" : "Confirmar transferencia a DAP"}
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Monto que transferiste ({currency})
          </label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-lg font-mono" />
          <p className="mt-1 text-xs text-muted-foreground">
            Esperado: {formatMoneyBare(expectedAmount, currency)} · Recolectado: {formatMoneyBare(collectedAmount, currency)}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Fecha real de transferencia
          </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            URL comprobante (opcional)
          </label>
          <input type="url" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="https://drive.google.com/... o similar"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Observaciones
          </label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
            placeholder="Ej: Falta el pago de X porque me pidió esperar unos días"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>

        <button onClick={submit} disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
          {pending ? <><Loader2 className="size-4 animate-spin" /> Enviando...</> : <><CheckCircle2 className="size-4" /> Enviar liquidación a DAP</>}
        </button>
      </div>
    </div>
  );
}
