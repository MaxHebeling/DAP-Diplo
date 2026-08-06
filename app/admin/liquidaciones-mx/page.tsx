import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { RemittanceRow } from "../liquidaciones/remittance-row";
import { pastorIdsInCountry } from "@/lib/pastor/country-filters";

export const metadata = { title: "Liquidaciones MX · Admin DAP" };
export const dynamic = "force-dynamic";

const MONTHS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function LiquidacionesMexicoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { admin: isAdmin } = await requireAdmin();
  if (!isAdmin) redirect("/dashboard");

  const admin = createAdminClient();
  const params = await searchParams;
  const now = new Date();

  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = (params.period ?? defaultPeriod).split("-").map((n) => parseInt(n, 10));

  // Restringir a pastores MX (los que tienen iglesia primaria en México)
  const mxPastorIds = await pastorIdsInCountry(admin, "México");

  const { data: remittances } = mxPastorIds.length > 0
    ? await admin.from("pastor_remittances").select("*")
        .eq("period_year", year).eq("period_month", month)
        .in("pastor_user_id", mxPastorIds)
    : { data: [] };

  // Nombres de pastores + iglesias
  const pastorIds = (remittances ?? []).map((r) => r.pastor_user_id);
  const pastorNames = new Map<string, string>();
  const pastorChurches = new Map<string, string>();
  if (pastorIds.length > 0) {
    const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", pastorIds);
    for (const p of profs ?? []) pastorNames.set(p.id, p.full_name);
    const { data: cps } = await admin.from("church_pastors")
      .select("pastor_user_id, church_id, is_primary")
      .in("pastor_user_id", pastorIds).eq("status", "active");
    const churchIds = Array.from(new Set((cps ?? []).map((c) => c.church_id)));
    const { data: churches } = churchIds.length > 0
      ? await admin.from("churches").select("id, name").in("id", churchIds)
      : { data: [] };
    const churchNameById = new Map((churches ?? []).map((c) => [c.id, c.name]));
    for (const cp of (cps ?? []).sort((a, b) => Number(b.is_primary) - Number(a.is_primary))) {
      if (!pastorChurches.has(cp.pastor_user_id)) {
        pastorChurches.set(cp.pastor_user_id, churchNameById.get(cp.church_id) ?? "?");
      }
    }
  }

  const totalExpected = (remittances ?? []).reduce((s, r) => s + (r.expected_amount_ars ?? 0), 0);
  const totalCollected = (remittances ?? []).reduce((s, r) => s + (r.collected_amount_ars ?? 0), 0);
  const totalTransferred = (remittances ?? []).reduce((s, r) => s + (r.transferred_amount_ars ?? 0), 0);
  const totalPending = Math.max(0, totalExpected - totalCollected);
  const overallPct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const sortedRemittances = [...(remittances ?? [])].sort((a, b) => {
    const pa = a.expected_amount_ars > 0 ? a.collected_amount_ars / a.expected_amount_ars : 0;
    const pb = b.expected_amount_ars > 0 ? b.collected_amount_ars / b.expected_amount_ars : 0;
    return pa - pb;
  });

  const periods: Array<{ value: string; label: string }> = [];
  for (let i = 3; i >= -5; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    periods.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[d.getMonth() + 1]} ${d.getFullYear()}`,
    });
  }

  return (
    <main className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-coral">Liquidaciones pastorales MX</p>
        <h1 className="font-grotesk text-3xl font-bold">{MONTHS[month]} {year}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada pastor MX consolida lo recolectado y transfiere a la cuenta Mercado Pago
          de DAP el día 1 del mes siguiente.
        </p>
      </header>

      {mxPastorIds.length === 0 && (
        <div className="mb-6 rounded-xl border border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
          Aún no hay pastores MX asignados a una iglesia mexicana con status activo.
        </div>
      )}

      {/* Barra de progreso general */}
      <div className="mb-4 rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">Avance general del periodo</p>
            <p className="mt-1 font-grotesk text-3xl font-bold">{overallPct}%</p>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">${totalCollected.toLocaleString("es-MX")}</span> / <span className="font-mono">${totalExpected.toLocaleString("es-MX")}</span> MXN
            {totalPending > 0 && (<span className="ml-2 text-amber-400">· Pendiente: <span className="font-mono">${totalPending.toLocaleString("es-MX")}</span></span>)}
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div className={`h-full transition-all ${overallPct === 100 ? "bg-emerald-500" : overallPct >= 50 ? "bg-amber-400" : overallPct > 0 ? "bg-brand-coral" : "bg-slate-500"}`} style={{ width: `${overallPct}%` }} />
        </div>
      </div>

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
            <a key={p.value} href={`/admin/liquidaciones-mx?period=${p.value}`}
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
            No hay liquidaciones MX para este periodo todavía. Se crean al entrar el pastor
            a su portal, o cuando el cron día 1 esté habilitado para MX.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRemittances.map((r) => (
            <RemittanceRow
              key={r.id}
              remittance={r}
              pastorName={pastorNames.get(r.pastor_user_id) ?? "?"}
              churchName={pastorChurches.get(r.pastor_user_id) ?? null}
            />
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
