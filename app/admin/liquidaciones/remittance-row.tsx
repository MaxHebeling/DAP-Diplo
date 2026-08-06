"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { confirmRemittanceReceivedAction } from "@/lib/pastor/remittance-actions";
import { formatMoney, formatMoneyBare } from "@/lib/format/money";

type Remittance = {
  id: string;
  status: string;
  individuals_count: number;
  marriages_count: number;
  people_covered: number;
  honor_scholarships_count: number;
  expected_amount_ars: number;
  collected_amount_ars: number;
  transferred_amount_ars: number | null;
  transfer_date_expected: string;
  transfer_date_actual: string | null;
  receipt_url: string | null;
  observations: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  updated_at?: string | null;
  currency: string;
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending_collection:  { text: "Pendiente recolección", cls: "text-slate-400" },
  collecting:          { text: "Recolectando",           cls: "text-brand-coral" },
  collection_ended:    { text: "Recolección cerrada",    cls: "text-brand-coral" },
  pending_transfer:    { text: "Pendiente transferir",   cls: "text-amber-400" },
  transferred:         { text: "Transferido a DAP",      cls: "text-emerald-400" },
  partial:             { text: "Parcial",                 cls: "text-amber-400" },
  needs_review:        { text: "Revisar",                 cls: "text-red-400" },
  canceled:            { text: "Cancelado",               cls: "text-slate-500" },
};

export function RemittanceRow({
  remittance: r,
  pastorName,
  churchName,
}: {
  remittance: Remittance;
  pastorName: string;
  churchName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [obs, setObs] = useState("");

  const diff = (r.transferred_amount_ars ?? 0) - r.expected_amount_ars;
  const statusInfo = STATUS_LABEL[r.status] ?? { text: r.status, cls: "text-muted-foreground" };
  const pct = r.expected_amount_ars > 0
    ? Math.min(100, Math.round((r.collected_amount_ars / r.expected_amount_ars) * 100))
    : 0;
  const pctColor = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : pct > 0 ? "bg-brand-coral" : "bg-slate-500";

  function confirmReceived() {
    startTransition(async () => {
      const res = await confirmRemittanceReceivedAction({ remittanceId: r.id, observations: obs || undefined });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("Recepción confirmada");
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            {churchName && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">
                {churchName}
              </p>
            )}
            <p className="font-grotesk text-lg font-semibold">{pastorName}</p>
            <p className={`text-xs font-semibold uppercase tracking-widest ${statusInfo.cls}`}>{statusInfo.text}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Fecha transf. esperada: <strong>{new Date(r.transfer_date_expected).toLocaleDateString("es-AR")}</strong></p>
            {r.transfer_date_actual && (
              <p>Fecha transf. real: <strong>{new Date(r.transfer_date_actual).toLocaleDateString("es-AR")}</strong></p>
            )}
            {r.updated_at && (
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                Última actualización: {new Date(r.updated_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Recaudación</span>
            <span className="font-mono font-bold">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div className={`h-full ${pctColor} transition-all`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Contadores */}
        <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
          <Metric label="Individuales" value={r.individuals_count} />
          <Metric label="Matrimonios" value={r.marriages_count} />
          <Metric label="Personas cubiertas" value={r.people_covered} />
          <Metric label="Becados" value={r.honor_scholarships_count} tone="amber" />
        </div>

        {/* Montos */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/50 p-3 text-xs">
          <Money label={`Esperado (${r.currency})`} value={r.expected_amount_ars} currency={r.currency} />
          <Money label={`Recolectado (${r.currency})`} value={r.collected_amount_ars} currency={r.currency}
            tone={r.collected_amount_ars < r.expected_amount_ars ? "amber" : "emerald"} />
          <Money label={`Transferido (${r.currency})`} value={r.transferred_amount_ars ?? 0} currency={r.currency}
            tone={r.transferred_amount_ars ? (Math.abs(diff) < 100 ? "emerald" : "amber") : undefined} />
        </div>

        {/* Diferencia */}
        {r.transferred_amount_ars !== null && Math.abs(diff) > 100 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2 text-xs text-amber-400">
            <AlertCircle className="size-3.5" />
            <span>Diferencia esperado vs transferido: <strong>{formatMoneyBare(diff, r.currency)}</strong></span>
          </div>
        )}

        {r.observations && (
          <p className="mt-3 text-xs text-muted-foreground italic">{r.observations}</p>
        )}
        {r.receipt_url && (
          <a href={r.receipt_url} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-brand-coral hover:underline">
            Ver comprobante →
          </a>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {r.submitted_at && !r.confirmed_at && (
            <button onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20">
              <CheckCircle2 className="size-3" /> Confirmar recepción admin
            </button>
          )}
          {r.confirmed_at && (
            <span className="text-[10px] uppercase tracking-widest text-emerald-400">
              ✓ Recepción confirmada por admin el {new Date(r.confirmed_at).toLocaleDateString("es-AR")}
            </span>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-semibold">Confirmar recepción de transferencia</h3>
              <button onClick={() => setConfirmOpen(false)}><X className="size-5" /></button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Pastor <strong>{pastorName}</strong> · monto: <strong>{formatMoney(r.transferred_amount_ars ?? 0, r.currency)}</strong>
            </p>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
              placeholder="Observaciones (opcional)"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={confirmReceived} disabled={pending}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Confirmar recepción
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
  const cls = tone === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <div className="rounded-md border border-border p-2 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}
function Money({ label, value, currency, tone }: { label: string; value: number; currency: string; tone?: "emerald" | "amber" }) {
  const cls = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-bold ${cls}`}>{formatMoneyBare(value, currency)}</p>
    </div>
  );
}
