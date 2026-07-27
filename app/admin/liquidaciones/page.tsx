import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { RemittanceRow } from "./remittance-row";

export const metadata = { title: "Liquidaciones pastorales · Admin DAP" };
export const dynamic = "force-dynamic";

const MONTHS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function LiquidacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { admin: isAdmin } = await requireAdmin();
  if (!isAdmin) redirect("/dashboard");

  const admin = createAdminClient();
  const params = await searchParams;
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const defaultPeriod = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  const [year, month] = (params.period ?? defaultPeriod).split("-").map((n) => parseInt(n, 10));

  const { data: remittances } = await admin.from("pastor_remittances").select("*")
    .eq("period_year", year).eq("period_month", month).order("created_at");

  // Nombres de pastores
  const pastorIds = (remittances ?? []).map((r) => r.pastor_user_id);
  const pastorNames = new Map<string, string>();
  if (pastorIds.length > 0) {
    const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", pastorIds);
    for (const p of profs ?? []) pastorNames.set(p.id, p.full_name);
  }

  const totalExpected = (remittances ?? []).reduce((s, r) => s + (r.expected_amount_ars ?? 0), 0);
  const totalCollected = (remittances ?? []).reduce((s, r) => s + (r.collected_amount_ars ?? 0), 0);
  const totalTransferred = (remittances ?? []).reduce((s, r) => s + (r.transferred_amount_ars ?? 0), 0);

  const periods = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[d.getMonth() + 1]} ${d.getFullYear()}`,
    });
  }

  return (
    <main className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-coral">Liquidaciones pastorales AR</p>
        <h1 className="font-grotesk text-3xl font-bold">{MONTHS[month]} {year}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada pastor consolida los pagos recibidos y transfiere a DAP el día 1 del mes siguiente.
        </p>
      </header>

      {/* Stats consolidadas */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Pastores" value={String(remittances?.length ?? 0)} />
        <Kpi label="Esperado" value={`$${(totalExpected/1000).toFixed(0)}k`} />
        <Kpi label="Recolectado" value={`$${(totalCollected/1000).toFixed(0)}k`} tone={totalCollected < totalExpected ? "amber" : "emerald"} />
        <Kpi label="Transferido a DAP" value={`$${(totalTransferred/1000).toFixed(0)}k`} tone={totalTransferred >= totalCollected * 0.9 ? "emerald" : "amber"} />
      </div>

      {/* Selector periodo */}
      <div className="mb-6">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Periodo:</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {periods.map((p) => (
            <a key={p.value} href={`/admin/liquidaciones?period=${p.value}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                (params.period ?? defaultPeriod) === p.value
                  ? "border-brand-violet bg-brand-violet/15 text-brand-violet"
                  : "border-border bg-card text-muted-foreground hover:border-brand-violet/40"
              }`}>{p.label}</a>
          ))}
        </div>
      </div>

      {/* Lista */}
      {(remittances?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay liquidaciones para este periodo. El cron día 1 las crea automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(remittances ?? []).map((r) => (
            <RemittanceRow key={r.id} remittance={r} pastorName={pastorNames.get(r.pastor_user_id) ?? "?"} />
          ))}
        </div>
      )}
    </main>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  const cls = tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400"
    : tone === "amber" ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-400"
    : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 font-grotesk text-2xl font-bold">{value}</p>
    </div>
  );
}
