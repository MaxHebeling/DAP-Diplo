import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertPastorRemittance } from "@/lib/pastor/remittance-actions";
import { getPastorBankAccount } from "@/lib/pastor/bank-accounts";
import { formatMoneyBare } from "@/lib/format/money";
import { RemittanceForm } from "./remittance-form";
import { PeriodSelector } from "../period-selector";

export const metadata = { title: "Liquidación · Portal Pastor" };
export const dynamic = "force-dynamic";

const MONTHS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function LiquidacionPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/pastor/liquidacion");

  const params = await searchParams;
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const defaultPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const [year, month] = (params.period ?? defaultPeriod).split("-").map((n) => parseInt(n, 10));

  // Upsert (siempre refresca contadores)
  await upsertPastorRemittance({ pastorUserId: user.id, year, month });

  const admin = createAdminClient();
  const { data: rem } = await admin.from("pastor_remittances").select("*")
    .eq("pastor_user_id", user.id).eq("period_year", year).eq("period_month", month)
    .single();

  if (!rem) return <p>Error cargando liquidación</p>;

  const { country: pastorCountry, account: bank } = await getPastorBankAccount(
    admin,
    user.id,
  );

  const canSubmit = ["pending_collection","collecting","collection_ended","pending_transfer","partial","needs_review"].includes(rem.status);
  const alreadyConfirmed = !!rem.confirmed_at;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">Liquidación mensual</p>
          <h2 className="mt-1 font-grotesk text-3xl font-bold">{MONTHS[month]} {year}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Consolidá lo recolectado durante el periodo y transferí a DAP.
            Fecha esperada de transferencia: <strong>{new Date(rem.transfer_date_expected).toLocaleDateString("es-AR")}</strong>.
          </p>
        </div>
        <PeriodSelector currentYear={year} currentMonth={month} basePath="/pastor/liquidacion" />
      </div>

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Individuales" value={String(rem.individuals_count)} />
        <Kpi label="Matrimonios" value={String(rem.marriages_count)} />
        <Kpi label="Personas cubiertas" value={String(rem.people_covered)} />
        <Kpi label="Becados (no cuentan)" value={String(rem.honor_scholarships_count)} tone="amber" />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Money label="Esperado" value={rem.expected_amount_ars} currency={rem.currency} />
        <Money label="Recolectado" value={rem.collected_amount_ars} currency={rem.currency}
          tone={rem.collected_amount_ars >= rem.expected_amount_ars ? "emerald" : "amber"} />
        <Money label="Ya transferido" value={rem.transferred_amount_ars ?? 0} currency={rem.currency}
          tone={rem.transferred_amount_ars ? "emerald" : "amber"} />
      </div>

      {/* Datos bancarios (según país del pastor) */}
      <div className="mb-6 rounded-xl border border-brand-coral/30 bg-brand-coral/[0.06] p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-coral">
          Cuenta destino DAP · {pastorCountry}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {bank.fields.map((f) => (
            <div
              key={f.label}
              className={`rounded-lg bg-card p-3 ${f.wide ? "sm:col-span-2" : ""}`}
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {f.label}
              </p>
              <p className="mt-1 font-mono break-all">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {alreadyConfirmed ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-center">
          <p className="text-lg font-semibold text-emerald-400">✓ Liquidación cerrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            La administración de DAP confirmó recibir tu transferencia el{" "}
            {new Date(rem.confirmed_at!).toLocaleDateString("es-AR")}.
          </p>
        </div>
      ) : canSubmit ? (
        <RemittanceForm
          remittanceId={rem.id}
          expectedAmount={rem.expected_amount_ars}
          collectedAmount={rem.collected_amount_ars}
          submittedAt={rem.submitted_at}
          transferredAmount={rem.transferred_amount_ars}
          currency={rem.currency}
        />
      ) : null}
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  const cls = tone === "amber" ? "border-amber-500/30 bg-amber-500/[0.06]" : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-grotesk text-2xl font-bold">{value}</p>
    </div>
  );
}
function Money({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: "emerald" | "amber";
}) {
  const cls = tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400"
    : tone === "amber" ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-400"
    : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-[10px] uppercase tracking-widest opacity-80">
        {label} <span className="opacity-70">({currency})</span>
      </p>
      <p className="mt-1 font-mono text-xl font-bold">{formatMoneyBare(value, currency)}</p>
    </div>
  );
}
