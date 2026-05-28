import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Visitas · DAP Admin" };
export const dynamic = "force-dynamic";

type VisitRow = {
  country: string | null;
  country_code: string | null;
  page_path: string | null;
  created_at: string;
};

type CountryAgg = {
  country_code: string | null;
  country: string | null;
  count: number;
};

type PageAgg = { page_path: string; count: number };

export default async function AdminVisitasPage() {
  const supabase = await createClient();

  const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: visits } = await supabase
    .from("visit_logs")
    .select("country, country_code, page_path, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<VisitRow[]>();

  const rows = visits ?? [];
  const total = rows.length;

  const last7Iso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const last7 = rows.filter((r) => r.created_at >= last7Iso).length;
  const last24Iso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const last24 = rows.filter((r) => r.created_at >= last24Iso).length;

  const byCountry = aggregateByCountry(rows);
  const byPage = aggregateByPage(rows);

  return (
    <main className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-1 font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
          Analytics
        </p>
        <h1 className="font-grotesk text-3xl font-bold text-foreground">
          Visitas
        </h1>
        <p className="mt-1 font-inter text-sm text-muted-foreground">
          Países desde los que entra gente al sitio público. Identidad anónima
          (IP hasheada). Últimos 30 días.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="30 días" value={total} />
        <Kpi label="7 días" value={last7} />
        <Kpi label="24 horas" value={last24} />
        <Kpi label="Países únicos" value={byCountry.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-grotesk text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Países
          </h2>
          {byCountry.length === 0 ? (
            <p className="font-inter text-sm text-muted-foreground">
              Aún no hay visitas registradas.
            </p>
          ) : (
            <ul className="space-y-2">
              {byCountry.slice(0, 25).map((c) => {
                const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                return (
                  <li key={c.country_code ?? "unknown"}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-lg">
                          {countryFlag(c.country_code)}
                        </span>
                        <span className="truncate font-inter text-sm">
                          {c.country ?? c.country_code ?? "Desconocido"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-inter text-xs">
                        <span className="text-muted-foreground">{pct}%</span>
                        <span className="font-semibold text-foreground">
                          {c.count}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-brand-violet to-brand-coral"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-grotesk text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Páginas más vistas
          </h2>
          {byPage.length === 0 ? (
            <p className="font-inter text-sm text-muted-foreground">
              Sin datos.
            </p>
          ) : (
            <ul className="space-y-2">
              {byPage.slice(0, 20).map((p) => (
                <li
                  key={p.page_path}
                  className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0"
                >
                  <span className="truncate font-mono text-xs">
                    {p.page_path || "/"}
                  </span>
                  <span className="shrink-0 font-inter text-xs font-semibold text-foreground">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-grotesk text-3xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

function aggregateByCountry(rows: VisitRow[]): CountryAgg[] {
  const m = new Map<string, { country: string | null; count: number }>();
  for (const r of rows) {
    const k = r.country_code ?? "unknown";
    const prev = m.get(k);
    m.set(k, {
      country: r.country ?? prev?.country ?? null,
      count: (prev?.count ?? 0) + 1,
    });
  }
  return [...m.entries()]
    .map(([code, v]) => ({
      country_code: code === "unknown" ? null : code,
      country: v.country,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);
}

function aggregateByPage(rows: VisitRow[]): PageAgg[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = r.page_path ?? "/";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([page_path, count]) => ({ page_path, count }))
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
