import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { redirect } from "next/navigation";
import { BillRow } from "./bill-row";

type Pastor = { id: string; full_name: string };

export const metadata = { title: "Pagos Argentina · Admin DAP" };
export const dynamic = "force-dynamic";

type Bill = {
  id: string;
  user_id: string | null;
  spousal_pair_id: string | null;
  period_year: number;
  period_month: number;
  collection_start: string;
  collection_end: string;
  modality: "individual" | "marriage" | "honor";
  amount_ars: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "exempt" | "canceled" | "suspended";
  paid_at: string | null;
  payment_method: string | null;
  received_amount_ars: number | null;
  observations: string | null;
};

type PairInfo = { id: string; s1: string; s2: string };

const MONTHS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function PagosArgentinaPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string; modality?: string }>;
}) {
  const { admin: isAdmin } = await requireAdmin();
  if (!isAdmin) redirect("/dashboard");

  const params = await searchParams;
  const admin = createAdminClient();
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = (params.period ?? defaultPeriod).split("-").map((n) => parseInt(n, 10));

  // Cargar bills del periodo
  let query = admin.from("monthly_bills").select("*")
    .eq("period_year", year).eq("period_month", month)
    .order("modality", { ascending: false })
    .order("status", { ascending: true });
  if (params.status) query = query.eq("status", params.status);
  if (params.modality) query = query.eq("modality", params.modality);
  const { data: bills } = await query.returns<Bill[]>();

  // Enriquecer con nombres
  const individualUserIds = (bills ?? []).filter((b) => b.user_id).map((b) => b.user_id!);
  const pairIds = (bills ?? []).filter((b) => b.spousal_pair_id).map((b) => b.spousal_pair_id!);

  const nameById = new Map<string, string>();
  if (individualUserIds.length > 0) {
    const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", individualUserIds);
    for (const p of profs ?? []) nameById.set(p.id, p.full_name);
  }

  // Cargar todos los pastores para el selector
  const { data: pastorsList } = await admin.from("profiles").select("id, full_name")
    .eq("role", "pastor").order("full_name");
  const pastors: Pastor[] = pastorsList ?? [];

  // Cargar asignaciones actuales
  const { data: currentAssignments } = await admin.from("pastor_assignments")
    .select("student_user_id, spousal_pair_id, pastor_user_id").eq("status", "active");
  const pastorByStudent = new Map<string, string>();
  const pastorByPair = new Map<string, string>();
  for (const a of currentAssignments ?? []) {
    if (a.student_user_id) pastorByStudent.set(a.student_user_id, a.pastor_user_id);
    if (a.spousal_pair_id) pastorByPair.set(a.spousal_pair_id, a.pastor_user_id);
  }

  const pairInfoById = new Map<string, PairInfo>();
  if (pairIds.length > 0) {
    const { data: pairs } = await admin.from("spousal_pairs")
      .select("id, spouse_1_user_id, spouse_2_user_id").in("id", pairIds);
    const allPairUserIds = new Set<string>();
    for (const p of pairs ?? []) { allPairUserIds.add(p.spouse_1_user_id); allPairUserIds.add(p.spouse_2_user_id); }
    const { data: pairProfs } = await admin.from("profiles").select("id, full_name")
      .in("id", Array.from(allPairUserIds));
    const pn = new Map<string, string>();
    for (const p of pairProfs ?? []) pn.set(p.id, p.full_name);
    for (const p of pairs ?? []) {
      pairInfoById.set(p.id, {
        id: p.id,
        s1: pn.get(p.spouse_1_user_id) ?? "?",
        s2: pn.get(p.spouse_2_user_id) ?? "?",
      });
    }
  }

  // Stats
  const totalEsperado = (bills ?? []).filter((b) => b.status !== "exempt" && b.status !== "canceled").reduce((s, b) => s + b.amount_ars, 0);
  const totalRecaudado = (bills ?? []).filter((b) => b.status === "paid").reduce((s, b) => s + (b.received_amount_ars ?? b.amount_ars), 0);
  const paidCount = (bills ?? []).filter((b) => b.status === "paid").length;
  const pendingCount = (bills ?? []).filter((b) => b.status === "pending").length;

  // Alumnos con beca — para mostrar aparte
  const { data: honors } = await admin.from("honor_scholarships")
    .select("user_id, status, start_date").in("status", ["vigente", "proxima_vencer"]);
  const honorIds = (honors ?? []).map((h) => h.user_id);
  const { data: honorProfs } = honorIds.length > 0
    ? await admin.from("profiles").select("id, full_name").in("id", honorIds)
    : { data: [] };

  const periodsAvailable = [
    { value: "2026-08", label: "Agosto 2026" },
    { value: "2026-09", label: "Septiembre 2026" },
    { value: "2026-10", label: "Octubre 2026" },
  ];

  return (
    <main className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-coral">Pagos Argentina · Pastoral</p>
        <h1 className="font-grotesk text-3xl font-bold text-foreground">
          {MONTHS[month]} {year}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Periodo de recolección: <strong>{new Date(bills?.[0]?.collection_start ?? "").getDate()}</strong>
          {" "}al{" "}
          <strong>{new Date(bills?.[0]?.collection_end ?? "").getDate()}</strong>
          {" "}de {MONTHS[month]}.
          Los pastores transfieren consolidado a DAP el día 1 de {MONTHS[month + 1] ?? "próximo mes"}.
        </p>
      </header>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-brand-coral/30 bg-brand-coral/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">Bills</p>
          <p className="mt-1 font-grotesk text-2xl font-bold">{bills?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Pagadas</p>
          <p className="mt-1 font-grotesk text-2xl font-bold text-emerald-400">{paidCount}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">Pendientes</p>
          <p className="mt-1 font-grotesk text-2xl font-bold text-amber-400">{pendingCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recaudado / Esperado</p>
          <p className="mt-1 font-grotesk text-lg font-bold">
            {(totalRecaudado / 1000).toFixed(0)}k / {(totalEsperado / 1000).toFixed(0)}k ARS
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FilterChip label="Todas" active={!params.status && !params.modality} query={{ period: params.period }} />
        <FilterChip label="Pendientes" active={params.status === "pending"} query={{ period: params.period, status: "pending" }} />
        <FilterChip label="Pagadas" active={params.status === "paid"} query={{ period: params.period, status: "paid" }} />
        <FilterChip label="Individuales" active={params.modality === "individual"} query={{ period: params.period, modality: "individual" }} />
        <FilterChip label="Matrimonios" active={params.modality === "marriage"} query={{ period: params.period, modality: "marriage" }} />
      </div>

      {/* Selector periodo */}
      <div className="mb-6">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Periodo:</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {periodsAvailable.map((p) => (
            <a
              key={p.value}
              href={`/admin/pagos-ar?period=${p.value}`}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                (params.period ?? defaultPeriod) === p.value
                  ? "border-brand-violet bg-brand-violet/15 text-brand-violet"
                  : "border-border bg-card text-muted-foreground hover:border-brand-violet/40"
              }`}
            >
              {p.label}
            </a>
          ))}
        </div>
      </div>

      {/* Lista de bills */}
      <div className="space-y-3">
        {(bills ?? []).map((bill) => {
          const label = bill.user_id
            ? nameById.get(bill.user_id) ?? "Alumno"
            : (() => {
                const p = pairInfoById.get(bill.spousal_pair_id!);
                return p ? `${p.s1} + ${p.s2}` : "Matrimonio";
              })();
          const currentPastor = bill.user_id
            ? pastorByStudent.get(bill.user_id)
            : bill.spousal_pair_id ? pastorByPair.get(bill.spousal_pair_id) : undefined;
          return (
            <BillRow
              key={bill.id}
              bill={bill}
              label={label}
              pastors={pastors}
              currentPastorId={currentPastor}
              targetKind={bill.user_id ? "student" : "pair"}
              targetId={bill.user_id ?? bill.spousal_pair_id!}
            />
          );
        })}
      </div>

      {/* Alumnos becados (visualmente separado, sin bills) */}
      {honorProfs && honorProfs.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-400">
            ⭐ Beca de Honor vigente ({honorProfs.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {honorProfs.map((h) => (
              <div key={h.id} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 text-sm">
                <span className="text-amber-300">{h.full_name}</span>
                <span className="ml-2 text-xs text-muted-foreground">— liberado de pagos</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function FilterChip({ label, active, query }: { label: string; active: boolean; query: Record<string, string | undefined> }) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const href = params.toString() ? `/admin/pagos-ar?${params}` : "/admin/pagos-ar";
  return (
    <a
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-brand-violet bg-brand-violet/15 text-brand-violet"
          : "border-border bg-card/50 text-muted-foreground hover:border-brand-violet/40"
      }`}
    >
      {label}
    </a>
  );
}
