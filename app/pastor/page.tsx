import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, Users, Clock } from "lucide-react";
import { getPastorBankAccount } from "@/lib/pastor/bank-accounts";
import { PastorBillRow } from "./pastor-bill-row";
import { PeriodSelector } from "./period-selector";

export const metadata = { title: "Portal Pastor · DAP" };
export const dynamic = "force-dynamic";

const MONTHS = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default async function PastorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/pastor");

  const admin = createAdminClient();
  const params = await searchParams;
  const now = new Date();

  // Iglesias a cargo de este pastor (Ticket 2 · iglesia-first)
  const { data: myChurches } = await admin.from("church_pastors")
    .select("church_id")
    .eq("pastor_user_id", user.id).eq("status", "active");
  const churchIds = (myChurches ?? []).map((c) => c.church_id);

  // Default de periodo: si el usuario NO pasa ?period=, elegimos
  // dinámicamente. Si hoy no hay bills pending para las iglesias del
  // pastor, saltamos al próximo mes con bills. Esto evita que un pastor
  // entrando el 15 de julio vea "pantalla vacía" cuando el ciclo activo
  // es agosto.
  let defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (!params.period && churchIds.length > 0) {
    // Buscar el mes con bills pending más próximo (this month first, then next 2)
    const { data: studentsForDefault } = await admin.from("profiles").select("id")
      .in("church_id", churchIds).eq("admission_status", "approved");
    const sids = (studentsForDefault ?? []).map((s) => s.id);
    if (sids.length > 0) {
      const candidates: Array<{ y: number; m: number }> = [
        { y: now.getFullYear(), m: now.getMonth() + 1 },
        { y: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), m: now.getMonth() === 11 ? 1 : now.getMonth() + 2 },
      ];
      for (const c of candidates) {
        const { data: b } = await admin.from("monthly_bills")
          .select("id").in("user_id", sids)
          .eq("period_year", c.y).eq("period_month", c.m)
          .eq("status", "pending").limit(1);
        if ((b ?? []).length > 0) {
          defaultPeriod = `${c.y}-${String(c.m).padStart(2, "0")}`;
          break;
        }
      }
    }
  }
  const [year, month] = (params.period ?? defaultPeriod).split("-").map((n) => parseInt(n, 10));

  // Alumnos de esas iglesias (profile.church_id ∈ churchIds). Incluye
  // al propio pastor si también es alumno DAP (dual-role) — necesita
  // ver su propio bill para registrar el pago cuando corresponda.
  const { data: churchStudents } = churchIds.length > 0
    ? await admin.from("profiles")
        .select("id, full_name, marriage_group_id")
        .in("church_id", churchIds)
        .eq("admission_status", "approved")
    : { data: [] };
  const allStudentIds = (churchStudents ?? []).map((s) => s.id);

  // Split individuales vs matrimonios. IMPORTANTE: filter status='active'
  // — un spousal_pair 'dissolved' NO debe agrupar al alumno como casado.
  const { data: pairsData } = allStudentIds.length > 0
    ? await admin.from("spousal_pairs")
        .select("id, spouse_1_user_id, spouse_2_user_id")
        .eq("status", "active")
        .or(`spouse_1_user_id.in.(${allStudentIds.join(",")}),spouse_2_user_id.in.(${allStudentIds.join(",")})`)
    : { data: [] };
  const marriedUserIds = new Set<string>();
  const pairIds: string[] = [];
  for (const p of pairsData ?? []) {
    pairIds.push(p.id);
    marriedUserIds.add(p.spouse_1_user_id);
    marriedUserIds.add(p.spouse_2_user_id);
  }
  const individualUserIds = allStudentIds.filter((id) => !marriedUserIds.has(id));

  // Bills del periodo asignadas a este pastor
  let indivBills: BillRow[] = [];
  let marriageBills: BillRow[] = [];
  if (individualUserIds.length > 0) {
    const { data } = await admin.from("monthly_bills").select("*")
      .in("user_id", individualUserIds).eq("period_year", year).eq("period_month", month)
      .returns<BillRow[]>();
    indivBills = data ?? [];
  }
  if (pairIds.length > 0) {
    const { data } = await admin.from("monthly_bills").select("*")
      .in("spousal_pair_id", pairIds).eq("period_year", year).eq("period_month", month)
      .returns<BillRow[]>();
    marriageBills = data ?? [];
  }

  // Nombres — reutilizamos churchStudents (ya trae todos los profiles)
  const nameById = new Map<string, string>();
  for (const s of churchStudents ?? []) nameById.set(s.id, s.full_name);

  const pairInfoById = new Map<string, { s1: string; s2: string }>();
  for (const p of pairsData ?? []) {
    pairInfoById.set(p.id, {
      s1: nameById.get(p.spouse_1_user_id) ?? "?",
      s2: nameById.get(p.spouse_2_user_id) ?? "?",
    });
  }

  // Alumnos honor asignados (informativo) — solo type='honor', no pastoral_mx
  const { data: honors } = individualUserIds.length > 0
    ? await admin.from("honor_scholarships").select("user_id, status")
        .in("user_id", individualUserIds)
        .eq("scholarship_type", "honor")
        .in("status", ["vigente", "proxima_vencer"])
    : { data: [] };
  const honorUserIds = new Set((honors ?? []).map((h) => h.user_id));

  // Cuenta bancaria de destino según país del pastor (AR=Brubank, MX=MP)
  const { country: pastorCountry, account: bank } = await getPastorBankAccount(
    admin,
    user.id,
  );

  // Cálculos
  const allBills = [...indivBills, ...marriageBills];
  const totalEsperado = allBills.filter((b) => b.status !== "exempt" && b.status !== "canceled").reduce((s, b) => s + b.amount_ars, 0);
  const totalRecaudado = allBills.filter((b) => b.status === "paid").reduce((s, b) => s + (b.received_amount_ars ?? b.amount_ars), 0);
  const totalPendiente = totalEsperado - totalRecaudado;
  const paidCount = allBills.filter((b) => b.status === "paid").length;
  const pendingCount = allBills.filter((b) => b.status === "pending").length;

  const collectionStart = allBills[0]?.collection_start ?? `${year}-${String(month).padStart(2,"0")}-23`;
  const collectionEnd = allBills[0]?.collection_end ?? "";

  return (
    <>
      {/* Header con selector de periodo */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">Periodo</p>
          <h2 className="mt-1 font-grotesk text-3xl font-bold">{MONTHS[month]} {year}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Recolección: <strong>{new Date(collectionStart).getDate()}</strong> al <strong>{collectionEnd ? new Date(collectionEnd).getDate() : "?"}</strong> de {MONTHS[month]}.
            Transferencia a DAP el día 1 de {MONTHS[month + 1] ?? "próximo mes"}.
          </p>
        </div>
        <PeriodSelector currentYear={year} currentMonth={month} basePath="/pastor" />
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Asignados" value={String(individualUserIds.length + pairIds.length)} icon={<Users className="size-3.5" />} />
        <Kpi label="Pagados" value={String(paidCount)} icon={<CheckCircle2 className="size-3.5" />} tone="emerald" />
        <Kpi label="Pendientes" value={String(pendingCount)} icon={<Clock className="size-3.5" />} tone="amber" />
        <Kpi label="Total a transferir" value={`$${(totalRecaudado/1000).toFixed(0)}k / ${(totalEsperado/1000).toFixed(0)}k`} icon={null} />
      </div>

      {/* Datos de transferencia a DAP (según país del pastor) */}
      <div className="mb-8 rounded-xl border border-brand-coral/30 bg-brand-coral/[0.06] p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-coral">
          Transferencia a DAP · {pastorCountry} · día 1 del mes
        </p>
        <p className="mb-3 text-sm text-foreground">Consolidá lo recolectado y transferí al siguiente destino:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {bank.fields.map((f) => (
            <div
              key={f.label}
              className={`rounded-lg bg-card p-3 ${f.wide ? "sm:col-span-2" : ""}`}
            >
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {f.label}
              </p>
              <p className="mt-1 font-mono text-sm break-all">{f.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          El monto total esperado del mes es <strong>${totalEsperado.toLocaleString("es-AR")} ARS</strong> (sin contar becas).
        </p>
      </div>

      {/* Lista unificada · orden: pendientes → pagados → becas */}
      {(indivBills.length > 0 || marriageBills.length > 0 || honorUserIds.size > 0) && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <Users className="size-4" /> Personas asignadas
          </h3>
          <div className="space-y-2">
            {/* Pendientes primero (para que el pastor los vea arriba) */}
            {indivBills
              .filter((b) => b.status !== "paid")
              .map((b) => (
                <PastorBillRow
                  key={b.id}
                  bill={b}
                  modality="individual"
                  label={nameById.get(b.user_id!) ?? "Alumno"}
                />
              ))}
            {marriageBills
              .filter((b) => b.status !== "paid")
              .map((b) => {
                const info = pairInfoById.get(b.spousal_pair_id!);
                return (
                  <PastorBillRow
                    key={b.id}
                    bill={b}
                    modality="marriage"
                    label={info ? `${info.s1} + ${info.s2}` : "Matrimonio"}
                  />
                );
              })}

            {/* Pagados */}
            {indivBills
              .filter((b) => b.status === "paid")
              .map((b) => (
                <PastorBillRow
                  key={b.id}
                  bill={b}
                  modality="individual"
                  label={nameById.get(b.user_id!) ?? "Alumno"}
                />
              ))}
            {marriageBills
              .filter((b) => b.status === "paid")
              .map((b) => {
                const info = pairInfoById.get(b.spousal_pair_id!);
                return (
                  <PastorBillRow
                    key={b.id}
                    bill={b}
                    modality="marriage"
                    label={info ? `${info.s1} + ${info.s2}` : "Matrimonio"}
                  />
                );
              })}

            {/* Becas al final (informativos, no cuentan en total) */}
            {[...honorUserIds].map((id) => (
              <PastorBillRow
                key={`honor-${id}`}
                bill={null}
                modality="honor"
                label={nameById.get(id) ?? id}
              />
            ))}
          </div>
        </div>
      )}

      {churchIds.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no tenés iglesias asignadas. Contactá a la administración de
            DAP para que te asocien con las iglesias que estás pastoreando.
          </p>
        </div>
      )}

      {churchIds.length > 0 && allBills.length === 0 && honorUserIds.size === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay alumnos activos en tus iglesias para este periodo, o las
            mensualidades del mes aún no fueron generadas.
          </p>
        </div>
      )}
    </>
  );
}

type BillRow = {
  id: string;
  user_id: string | null;
  spousal_pair_id: string | null;
  amount_ars: number;
  received_amount_ars: number | null;
  status: "pending" | "paid" | "overdue" | "exempt" | "canceled" | "suspended";
  paid_at: string | null;
  payment_method: string | null;
  observations: string | null;
  collection_start: string;
  collection_end: string;
};

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: "emerald" | "amber" }) {
  const cls = tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400"
    : tone === "amber" ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-400"
    : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center gap-2 opacity-80">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-1 font-grotesk text-2xl font-bold">{value}</p>
    </div>
  );
}
