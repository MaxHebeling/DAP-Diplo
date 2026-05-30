import { createClient } from "@/lib/supabase/server";
import { LeadsTable } from "@/components/admin/leads-table";

export const metadata = { title: "Leads · DAP Admin" };
export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  country_code: string | null;
  message: string | null;
  source: string;
  page_path: string | null;
  status: string;
  offered_at: string | null;
  created_at: string;
};

type CountryAgg = { country_code: string | null; count: number };

export default async function AdminLeadsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, email, full_name, phone, country, country_code, message, source, page_path, status, offered_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<LeadRow[]>();

  const rows = leads ?? [];
  const countryAgg = aggregateByCountry(rows);
  const total = rows.length;
  const newCount = rows.filter((l) => l.status === "new").length;
  const offeredCount = rows.filter((l) => l.status === "offered").length;
  const convertedCount = rows.filter((l) => l.status === "converted").length;

  return (
    <main className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-1 font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
          Marketing
        </p>
        <h1 className="font-grotesk text-3xl font-bold text-foreground">
          Leads
        </h1>
        <p className="mt-1 font-inter text-sm text-muted-foreground">
          Contactos voluntarios capturados desde el formulario público.
        </p>
      </header>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total" value={total} accent="violet" />
        <Kpi label="Nuevos" value={newCount} accent="coral" />
        <Kpi label="Ofertados" value={offeredCount} accent="emerald" />
        <Kpi label="Convertidos" value={convertedCount} accent="emerald" />
      </div>

      {/* Por país */}
      {countryAgg.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-grotesk text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Por país
          </h2>
          <div className="flex flex-wrap gap-2">
            {countryAgg.slice(0, 12).map((c) => (
              <span
                key={c.country_code ?? "unknown"}
                className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 font-inter text-xs"
              >
                <span className="text-base">
                  {countryFlag(c.country_code)}
                </span>
                <span className="font-medium">
                  {c.country_code ?? "—"}
                </span>
                <span className="text-muted-foreground">{c.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Tabla */}
      <LeadsTable leads={rows} />
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "violet" | "coral" | "emerald";
}) {
  const ring =
    accent === "violet"
      ? "ring-brand-violet/30 bg-brand-violet/[0.04]"
      : accent === "coral"
        ? "ring-brand-coral/30 bg-brand-coral/[0.04]"
        : "ring-emerald-400/30 bg-emerald-400/[0.04]";
  return (
    <div className={`rounded-xl border bg-card p-4 ring-1 ${ring}`}>
      <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-grotesk text-3xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function aggregateByCountry(rows: LeadRow[]): CountryAgg[] {
  const m = new Map<string | null, number>();
  for (const r of rows) {
    const k = r.country_code ?? null;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([country_code, count]) => ({ country_code, count }))
    .sort((a, b) => b.count - a.count);
}

function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌎";
  const base = 0x1f1e6 - "A".charCodeAt(0);
  return (
    String.fromCodePoint(code.charCodeAt(0) + base) +
    String.fromCodePoint(code.charCodeAt(1) + base)
  );
}
