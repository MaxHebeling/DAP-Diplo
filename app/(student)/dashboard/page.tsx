import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Circle,
  GraduationCap,
  Layers,
  Sparkles,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

import { DapButton } from "@/components/ui-dap/button";
import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { DapProgressBar } from "@/components/ui-dap/progress-bar";
import {
  DapRankBadge,
  type RankOrder,
} from "@/components/ui-dap/rank-badge";
import { DapStat } from "@/components/ui-dap/stat";
import { DapStudentSidebar } from "@/components/layouts/dap-student-sidebar";
import { DapStudentTopbar } from "@/components/layouts/dap-student-topbar";
import { PauseBanner } from "@/components/student/pause-banner";

export const metadata = { title: "Mi dashboard — DAP" };

type ProfileRow = {
  full_name: string;
  ministry_name: string | null;
  country: string | null;
  avatar_url: string | null;
  role: "student" | "admin";
};

type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  months_paid_total: number;
  current_month_number: number;
  paused_at: string | null;
  pause_reason: string | null;
  extension_count: number;
  stripe_subscription_id: string | null;
};

type ModuleListItem = {
  id: string;
  slug: string;
  order_index: number;
  title: string;
  subtitle: string | null;
  approved: boolean;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const RANK_NAMES = [
  "Discípulo",
  "Hijo",
  "Líder",
  "Pastor",
  "Administrador",
  "Mayordomo",
  "Reformador",
  "Arquitecto",
  "Enviado",
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("full_name, ministry_name, country, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (profErr) throw new Error(`No se pudo cargar perfil: ${profErr.message}`);
  if (!profile) throw new Error("Tu perfil no existe en la base de datos.");

  const firstName = profile.full_name.split(" ")[0];

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      `id, status, current_period_end, cancel_at_period_end, cancel_at,
       months_paid_total, current_month_number, paused_at, pause_reason,
       extension_count, stripe_subscription_id`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  const hasActive =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    (sub.current_period_end === null ||
      new Date(sub.current_period_end) > new Date());

  const isPaused = hasActive && !!sub?.paused_at;

  return (
    <div className="flex min-h-screen bg-surface-base text-text-primary">
      <DapStudentSidebar
        userName={profile.full_name}
        userAvatar={profile.avatar_url}
        rank={
          hasActive && sub
            ? rankForMonth(sub.current_month_number)
            : null
        }
        onSignOut={signOutAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DapStudentTopbar title="Inicio" />

        <main className="flex-1 overflow-y-auto px-6 py-10 sm:px-10">
          {!hasActive && (
            <NoSubscriptionState
              firstName={firstName}
              hadCanceledSub={!!sub && sub.status === "canceled"}
            />
          )}

          {hasActive && sub && (
            <ActiveSubscriptionDashboard
              firstName={firstName}
              isAdmin={profile.role === "admin"}
              sub={sub}
              isPaused={isPaused}
              userId={user.id}
              cancelDate={
                sub.cancel_at_period_end || sub.cancel_at
                  ? formatDate(sub.cancel_at ?? sub.current_period_end)
                  : null
              }
              nextBillDate={formatDate(sub.current_period_end)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function rankForMonth(month: number): { order: RankOrder; label: string } | null {
  if (month < 1) return null;
  const phase = Math.min(9, Math.ceil(month / 2)) as RankOrder;
  return { order: phase, label: RANK_NAMES[phase - 1] };
}

// =====================================================================
// ESTADO 1: SIN suscripción activa
// =====================================================================
function NoSubscriptionState({
  firstName,
  hadCanceledSub,
}: {
  firstName: string;
  hadCanceledSub: boolean;
}) {
  return (
    <div className="relative isolate mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-elevated p-12 text-center">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-50 [background:radial-gradient(60%_50%_at_50%_30%,rgba(123,97,255,0.25),transparent_55%),radial-gradient(60%_50%_at_50%_70%,rgba(255,77,109,0.18),transparent_55%)]"
      />
      <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-text-secondary backdrop-blur">
        <Sparkles className="size-3.5 text-brand-coral" />
        Diplomado Apostólico Pastoral
      </p>
      <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
        Hola, {firstName}.{" "}
        {hadCanceledSub ? (
          <span className="gradient-text">Reactiva tu diplomado</span>
        ) : (
          <span className="gradient-text">Comienza tu formación</span>
        )}
      </h1>
      <p className="mx-auto mt-4 max-w-xl font-inter text-base leading-relaxed text-text-secondary">
        {hadCanceledSub
          ? "Tu suscripción está cancelada pero conservamos todo tu progreso: módulos aprobados, dimensiones alcanzadas y certificados. Cuando reactives, retomas donde lo dejaste."
          : "18 meses de formación con 200 módulos. Cada mes desbloqueas nuevos módulos si completas los actuales. $25 USD/mes, cancela cuando quieras."}
      </p>
      <div className="mt-8">
        <DapButton render={<Link href="/suscribirme" />} size="lg">
          {hadCanceledSub ? "Reactivar suscripción" : "Suscribirme — $25/mes"}
          <ArrowRight />
        </DapButton>
      </div>
    </div>
  );
}

// =====================================================================
// ESTADOS 2 + 3: con sub activa
// =====================================================================
async function ActiveSubscriptionDashboard({
  firstName,
  isAdmin,
  sub,
  isPaused,
  userId,
  cancelDate,
  nextBillDate,
}: {
  firstName: string;
  isAdmin: boolean;
  sub: SubscriptionRow;
  isPaused: boolean;
  userId: string;
  cancelDate: string | null;
  nextBillDate: string | null;
}) {
  const supabase = await createClient();
  const month = sub.current_month_number;

  const { data: monthModules } = await supabase
    .from("modules")
    .select("id, slug, order_index, title, subtitle, phase_id")
    .eq("course_month", month)
    .order("order_index");

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, completed")
    .eq("user_id", userId)
    .eq("completed", true)
    .in("module_id", (monthModules ?? []).map((m) => m.id));

  const approvedSet = new Set((progressRows ?? []).map((p) => p.module_id));

  const modules: ModuleListItem[] = (monthModules ?? []).map((m) => ({
    id: m.id,
    slug: m.slug,
    order_index: m.order_index,
    title: m.title,
    subtitle: m.subtitle,
    approved: approvedSet.has(m.id),
  }));

  const approvedCount = modules.filter((m) => m.approved).length;
  const totalCount = modules.length;
  const firstPending = modules.find((m) => !m.approved);

  const phaseId = monthModules?.[0]?.phase_id;
  const { data: phaseRow } = phaseId
    ? await supabase
        .from("phases")
        .select("id, order_index, title, slug")
        .eq("id", phaseId)
        .maybeSingle()
    : { data: null };

  const { data: daysPaused } = await supabase.rpc("days_paused", {
    p_user_id: userId,
  });
  const days = typeof daysPaused === "number" ? daysPaused : 0;

  let hasExtensionForPhase = false;
  if (phaseId) {
    const { count } = await supabase
      .from("pause_extensions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("phase_id", phaseId);
    hasExtensionForPhase = (count ?? 0) > 0;
  }

  const rank = rankForMonth(month);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            {phaseRow
              ? `Fase ${String(phaseRow.order_index).padStart(2, "0")} · ${phaseRow.title}`
              : "Diplomado Apostólico Pastoral"}
          </p>
          <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
            Hola, {firstName}.{" "}
            {isPaused ? (
              <span className="text-text-secondary">Suscripción pausada.</span>
            ) : (
              <>
                Mes <span className="gradient-text">{month} de 18</span>.
              </>
            )}
          </h1>
          {isAdmin && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-0.5 font-inter text-xs font-medium text-brand-violet">
              Admin
            </p>
          )}
        </div>
        {rank && (
          <DapRankBadge rankOrder={rank.order} size="xl" label={rank.label} />
        )}
      </header>

      {/* Pause banner */}
      {isPaused && (
        <PauseBanner
          daysPaused={days}
          currentMonth={month}
          approvedCount={approvedCount}
          totalCount={totalCount}
          canRequestExtension={!hasExtensionForPhase}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DapCard>
          <DapStat
            icon={BookOpen}
            value={`${approvedCount} / ${totalCount}`}
            label="Módulos aprobados (mes)"
          />
        </DapCard>
        <DapCard>
          <DapStat
            icon={Layers}
            value={`Mes ${month}`}
            label="Tu mes académico"
            accent="coral"
          />
        </DapCard>
        <DapCard>
          <DapStat
            icon={GraduationCap}
            value={
              sub.months_paid_total === 0
                ? "—"
                : String(sub.months_paid_total)
            }
            label={
              sub.months_paid_total === 1 ? "mes pagado" : "meses pagados"
            }
            accent="amber"
          />
        </DapCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Columna principal */}
        <section className="space-y-6">
          <DapCard>
            <DapCardHeader>
              <DapCardTitle>Progreso del Mes {month}</DapCardTitle>
              <DapCardDescription>
                {totalCount > 0
                  ? `${approvedCount} de ${totalCount} módulos aprobados`
                  : "Sin módulos cargados todavía"}
              </DapCardDescription>
            </DapCardHeader>
            <DapProgressBar
              value={totalCount > 0 ? (approvedCount / totalCount) * 100 : 0}
            />

            {firstPending && !isPaused && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                    Próximo paso
                  </p>
                  <p className="truncate font-inter text-sm font-semibold text-text-primary">
                    Módulo {firstPending.order_index}: {firstPending.title}
                  </p>
                </div>
                <DapButton
                  size="sm"
                  render={
                    <Link
                      href={`/fases/${phaseRow?.slug ?? ""}/modulos/${firstPending.slug}`}
                    />
                  }
                >
                  Ir
                  <ArrowRight />
                </DapButton>
              </div>
            )}
          </DapCard>

          <DapCard className="overflow-hidden p-0">
            <h3 className="border-b border-white/[0.06] px-5 py-3 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Módulos del Mes {month}
            </h3>
            <ul>
              {modules.map((m) => (
                <li key={m.id} className="border-b border-white/[0.04] last:border-b-0">
                  <Link
                    href={`/fases/${phaseRow?.slug ?? ""}/modulos/${m.slug}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                  >
                    {m.approved ? (
                      <CheckCircle2
                        className="size-5 shrink-0 text-emerald-400"
                        strokeWidth={2}
                      />
                    ) : (
                      <Circle
                        className="size-5 shrink-0 text-text-tertiary/50"
                        strokeWidth={2}
                      />
                    )}
                    <span className="flex-1 truncate font-inter text-sm">
                      <span className="tabular-nums text-text-tertiary">
                        {String(m.order_index).padStart(2, "0")}
                      </span>{" "}
                      <span className="font-semibold text-text-primary">
                        {m.title}
                      </span>
                      {m.subtitle && (
                        <span className="ml-2 text-text-secondary">
                          · {m.subtitle}
                        </span>
                      )}
                    </span>
                    {m.approved ? (
                      <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 font-inter text-[10px] font-medium text-emerald-300">
                        Aprobado
                      </span>
                    ) : (
                      <ArrowRight className="size-4 shrink-0 text-text-tertiary/50" />
                    )}
                  </Link>
                </li>
              ))}
              {modules.length === 0 && (
                <li className="px-5 py-8 text-center font-inter text-sm text-text-tertiary">
                  No hay módulos cargados para el Mes {month} todavía.
                </li>
              )}
            </ul>
          </DapCard>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <DapCard>
            <h3 className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Tu suscripción
            </h3>
            <p className="mt-2 font-grotesk text-h4 font-semibold text-text-primary">
              {isPaused
                ? "Pausada"
                : sub.status === "trialing"
                  ? "En prueba"
                  : "Activa"}
            </p>
            <p className="mt-1 font-inter text-xs text-text-secondary">
              {isPaused
                ? "Sin cargos hasta que retomes."
                : cancelDate
                  ? `Se cancela el ${cancelDate}.`
                  : nextBillDate
                    ? `Próximo cobro: ${nextBillDate}.`
                    : "—"}
            </p>
            <form action="/api/billing/portal" method="POST" className="mt-4">
              <DapButton
                type="submit"
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Gestionar
              </DapButton>
            </form>
          </DapCard>

          <DapCard>
            <h3 className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Tu recorrido
            </h3>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="font-grotesk text-h2 font-bold tabular-nums gradient-text">
                {month}
              </span>
              <span className="font-inter text-sm text-text-secondary">
                / 18 meses
              </span>
            </p>
            <p className="mt-1 font-inter text-xs text-text-tertiary">
              {sub.months_paid_total === 0
                ? "Primer mes en curso."
                : `${sub.months_paid_total} ${sub.months_paid_total === 1 ? "mes" : "meses"} pagados.`}
            </p>
          </DapCard>

          <div className="relative overflow-hidden rounded-xl border border-brand-violet/20 bg-brand-violet/[0.04] p-5">
            <Sparkles
              className="mb-2 size-5 text-brand-coral"
              strokeWidth={1.8}
            />
            <p className="font-grotesk text-sm font-semibold text-text-primary">
              Tutor IA disponible
            </p>
            <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
              Pregúntale sobre cualquier doctrina del DAP.
            </p>
            <DapButton
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start px-0"
              render={<Link href="/tutor" />}
            >
              <CalendarClock className="size-3.5" />
              Abrir tutor
              <ArrowRight />
            </DapButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
