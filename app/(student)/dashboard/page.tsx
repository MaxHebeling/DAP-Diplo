import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  Sparkles,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import {
  DAP_TZ,
  estimateWeekOpensAt,
  formatDapDateTime,
  formatDapLongDate,
  weekStatus,
  type WeekStatus,
} from "@/lib/calendar/week";

import { DapButton } from "@/components/ui-dap/button";
import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { DapStudentShell } from "@/components/layouts/dap-student-shell";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";

export const metadata = { title: "Mi dashboard — DAP" };

type ProfileRow = {
  full_name: string;
  ministry_name: string | null;
  country: string | null;
  avatar_url: string | null;
  role: "student" | "admin";
  program_start_date: string | null;
  matricula: string | null;
};

type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
};

type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  course_week: number;
  block: { slug: string; title: string; order_index: number } | null;
};

type ModuleProgressRow = {
  module_id: string;
  completed: boolean;
};

type WeekWindowRow = {
  opens_at: string | null;
  closes_at: string | null;
  course_week: number;
};

function formatBillingDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: DAP_TZ,
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select(
      "full_name, ministry_name, country, avatar_url, role, program_start_date, matricula",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (profErr) throw new Error(`No se pudo cargar perfil: ${profErr.message}`);
  if (!profile) throw new Error("Tu perfil no existe en la base de datos.");

  const firstName = profile.full_name.split(" ")[0];

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "id, status, current_period_end, cancel_at_period_end, canceled_at",
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

  return (
    <DapStudentShell
      userName={profile.full_name}
      userAvatar={profile.avatar_url}
      title="Inicio"
      onSignOut={signOutAction}
    >
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {!hasActive ? (
          <NoSubscriptionState
            firstName={firstName}
            hadCanceledSub={!!sub && sub.status === "canceled"}
          />
        ) : (
          <WeekDashboard
            firstName={firstName}
            isAdmin={profile.role === "admin"}
            programStartDate={profile.program_start_date}
            matricula={profile.matricula}
            cancelDate={
              sub?.cancel_at_period_end
                ? formatBillingDate(sub?.current_period_end ?? null)
                : null
            }
            nextBillDate={formatBillingDate(sub?.current_period_end ?? null)}
            userId={user.id}
          />
        )}
      </div>
    </DapStudentShell>
  );
}

// =====================================================================
// ESTADO: sin suscripción (mantenido del dashboard previo)
// =====================================================================
function NoSubscriptionState({
  firstName,
  hadCanceledSub,
}: {
  firstName: string;
  hadCanceledSub: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
          Diplomado Apostólico Pastoral
        </p>
        <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
          Hola, {firstName}.
        </h1>
        <p className="mt-3 font-inter text-base leading-relaxed text-text-secondary">
          {hadCanceledSub
            ? "Tu suscripción está cancelada. Reactiva cuando quieras y retomas desde donde dejaste."
            : "Tu suscripción aún no está activa. Empieza la formación cuando estés listo."}
        </p>
      </header>

      <DapCard>
        <DapCardHeader>
          <DapCardTitle>Activa tu acceso</DapCardTitle>
          <DapCardDescription>
            $25 USD/mes · cancelas cuando quieras · todos los módulos se
            liberan semana a semana.
          </DapCardDescription>
        </DapCardHeader>
        <div className="mt-4">
          <DapButton render={<Link href="/suscribirme" />} size="lg">
            Continuar
            <ArrowRight />
          </DapButton>
        </div>
      </DapCard>
    </div>
  );
}

// =====================================================================
// ESTADO: con suscripción activa — dashboard semanal (Fase 3 v3.3)
// =====================================================================
async function WeekDashboard({
  firstName,
  isAdmin,
  programStartDate,
  matricula,
  cancelDate,
  nextBillDate,
  userId,
}: {
  firstName: string;
  isAdmin: boolean;
  programStartDate: string | null;
  matricula: string | null;
  cancelDate: string | null;
  nextBillDate: string | null;
  userId: string;
}) {
  const supabase = await createClient();

  // 1) Semana actual + ventana
  const { data: weekWindowData } = await supabase
    .rpc("current_week_window", { p_user_id: userId })
    .single<WeekWindowRow>();

  const currentWeek = weekWindowData?.course_week ?? 0;

  // 2) Si todavía no arrancó (admin sin program_start_date o futuro)
  if (currentWeek === 0) {
    return (
      <NotStartedYet
        firstName={firstName}
        programStartDate={programStartDate}
        matricula={matricula}
        isAdmin={isAdmin}
      />
    );
  }

  // 3) Todos los módulos (72) — vienen siempre ordenados por course_week
  const { data: modules } = await supabase
    .from("modules")
    .select(
      "id, slug, title, subtitle, course_week, block:blocks(slug, title, order_index)",
    )
    .order("course_week", { ascending: true })
    .returns<ModuleRow[]>();

  // 4) Progreso del alumno
  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, completed")
    .eq("user_id", userId)
    .returns<ModuleProgressRow[]>();

  const progressById = new Map<string, boolean>(
    (progressRows ?? []).map((p) => [p.module_id, p.completed]),
  );

  const allModules = modules ?? [];
  const currentModule = allModules.find((m) => m.course_week === currentWeek);
  const pastModules = allModules
    .filter((m) => m.course_week < currentWeek)
    .reverse()
    .slice(0, 6); // las 6 más recientes
  const upcomingModules = allModules
    .filter((m) => m.course_week > currentWeek)
    .slice(0, 3); // las 3 siguientes

  const completedCount = (progressRows ?? []).filter(
    (p) => p.completed,
  ).length;
  const completionPct = Math.round((completedCount / 72) * 100);

  const closesAt = weekWindowData?.closes_at
    ? new Date(weekWindowData.closes_at)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            Diplomado Apostólico Pastoral
          </p>
          <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
            Hola, {firstName}.
          </h1>
          <p className="mt-3 font-inter text-base text-text-secondary">
            Estás en la <span className="font-semibold text-text-primary">Semana {currentWeek} de 72</span> del programa.
          </p>
        </div>
        {matricula && (
          <p className="font-mono text-xs text-text-tertiary">{matricula}</p>
        )}
      </header>

      {/* Tu módulo de esta semana */}
      <div data-tour="current-module">
        {currentModule ? (
          <CurrentWeekCard
            module={currentModule}
            isCompleted={progressById.get(currentModule.id) === true}
            closesAt={closesAt}
          />
        ) : (
          <DapCard>
            <p className="text-sm text-text-secondary">
              No encontramos el módulo de esta semana. Si esto persiste,
              avísanos a admisiones@dapglobal.org.
            </p>
          </DapCard>
        )}
      </div>

      {/* Progreso global */}
      <div data-tour="progress">
        <ProgressBar
          completedCount={completedCount}
          completionPct={completionPct}
        />
      </div>

      {/* Módulos pasados + próximos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PastModulesList
          modules={pastModules}
          progressById={progressById}
        />
        <div data-tour="upcoming">
          <UpcomingModulesList
            modules={upcomingModules}
            programStartDate={programStartDate}
          />
        </div>
      </div>

      {/* Subscripción */}
      <div data-tour="resources">
        <SubscriptionPanel
          cancelDate={cancelDate}
          nextBillDate={nextBillDate}
          isAdmin={isAdmin}
        />
      </div>

      {/* Tour interactivo de bienvenida (primera vez por device) */}
      <DashboardTour />
    </div>
  );
}

// =====================================================================
// Sub-componentes presentacionales
// =====================================================================

function NotStartedYet({
  firstName,
  programStartDate,
  matricula,
  isAdmin,
}: {
  firstName: string;
  programStartDate: string | null;
  matricula: string | null;
  isAdmin: boolean;
}) {
  const startsAt = programStartDate
    ? formatDapLongDate(new Date(`${programStartDate}T12:00:00`))
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
          Diplomado Apostólico Pastoral
        </p>
        <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
          Bienvenido, {firstName}.
        </h1>
        {isAdmin && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-0.5 font-inter text-xs font-medium text-brand-violet">
            Admin
          </p>
        )}
      </header>

      <DapCard>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
            <CalendarClock className="size-6" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-grotesk text-h4 font-semibold text-text-primary">
              Tu programa empieza pronto
            </h2>
            {startsAt ? (
              <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
                Inicia el <span className="font-semibold text-text-primary">{startsAt}</span>.
                Ese día abre la Semana 1 y vas a recibir un aviso por email.
              </p>
            ) : (
              <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
                Todavía no tienes fecha de inicio asignada. Te llegará un email
                cuando admisiones apruebe tu solicitud y emita tu matrícula.
              </p>
            )}
            {matricula && (
              <p className="mt-3 font-mono text-xs text-text-tertiary">
                Matrícula · {matricula}
              </p>
            )}
          </div>
        </div>
      </DapCard>

      <p className="font-inter text-xs text-text-tertiary">
        Mientras tanto puedes explorar la <Link href="/comunidad" className="text-brand-coral hover:underline">comunidad</Link> o el <Link href="/tutor" className="text-brand-coral hover:underline">tutor IA</Link>.
      </p>
    </div>
  );
}

function CurrentWeekCard({
  module,
  isCompleted,
  closesAt,
}: {
  module: ModuleRow;
  isCompleted: boolean;
  closesAt: Date | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-coral/25 bg-gradient-to-br from-brand-violet/[0.10] via-surface-elevated to-brand-coral/[0.06] p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-coral/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            Tu módulo de esta semana · Semana {module.course_week}
          </p>
          <h2 className="mt-2 font-grotesk text-h2 font-bold leading-tight text-text-primary">
            {module.title}
          </h2>
          {module.subtitle && (
            <p className="mt-1 font-inter text-sm text-text-secondary">
              {module.subtitle}
            </p>
          )}
          {module.block && (
            <p className="mt-3 font-inter text-xs text-text-tertiary">
              Bloque {String(module.block.order_index).padStart(2, "0")} · {module.block.title}
            </p>
          )}
          {closesAt && !isCompleted && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 font-inter text-xs text-text-secondary">
              <Clock className="size-3.5 text-brand-coral" />
              La tarea cierra el {formatDapDateTime(closesAt)}
            </p>
          )}
          {isCompleted && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 font-inter text-xs text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              Módulo completado
            </p>
          )}
        </div>
        <DapButton
          render={
            <Link
              href={
                module.block
                  ? `/fases/${module.block.slug}/modulos/${module.slug}`
                  : `/fases`
              }
            />
          }
          size="lg"
        >
          {isCompleted ? "Repasar" : "Continuar"}
          <ArrowRight />
        </DapButton>
      </div>
    </div>
  );
}

function ProgressBar({
  completedCount,
  completionPct,
}: {
  completedCount: number;
  completionPct: number;
}) {
  return (
    <DapCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
            Tu progreso
          </p>
          <p className="mt-1 font-grotesk text-h3 font-semibold text-text-primary">
            {completedCount} <span className="text-text-secondary">de 72 módulos</span>
          </p>
        </div>
        <p className="font-grotesk text-h2 font-bold text-brand-coral">
          {completionPct}%
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-coral transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>
    </DapCard>
  );
}

function PastModulesList({
  modules,
  progressById,
}: {
  modules: ModuleRow[];
  progressById: Map<string, boolean>;
}) {
  if (modules.length === 0) {
    return (
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>Repaso</DapCardTitle>
          <DapCardDescription>
            Apenas comienza tu programa — todavía no hay módulos para repasar.
          </DapCardDescription>
        </DapCardHeader>
      </DapCard>
    );
  }
  return (
    <DapCard>
      <DapCardHeader>
        <DapCardTitle>Repaso · semanas anteriores</DapCardTitle>
        <DapCardDescription>
          El contenido siempre está disponible. Las tareas ya cerraron.
        </DapCardDescription>
      </DapCardHeader>
      <ul className="mt-4 space-y-2">
        {modules.map((m) => (
          <ModuleListItem
            key={m.id}
            module={m}
            status="review"
            isCompleted={progressById.get(m.id) === true}
          />
        ))}
      </ul>
    </DapCard>
  );
}

function UpcomingModulesList({
  modules,
  programStartDate,
}: {
  modules: ModuleRow[];
  programStartDate: string | null;
}) {
  if (modules.length === 0) {
    return (
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>Próximos</DapCardTitle>
          <DapCardDescription>
            Has llegado al final del programa. Felicidades.
          </DapCardDescription>
        </DapCardHeader>
      </DapCard>
    );
  }
  return (
    <DapCard>
      <DapCardHeader>
        <DapCardTitle>Próximos · te esperan</DapCardTitle>
        <DapCardDescription>
          Cada módulo se abre el martes de su semana.
        </DapCardDescription>
      </DapCardHeader>
      <ul className="mt-4 space-y-2">
        {modules.map((m) => {
          const opensAt = estimateWeekOpensAt(programStartDate, m.course_week);
          return (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-grotesk text-sm font-medium text-text-primary">
                  Semana {m.course_week} · {m.title}
                </p>
                {opensAt && (
                  <p className="font-inter text-xs text-text-tertiary">
                    Abre {formatDapLongDate(opensAt)}
                  </p>
                )}
              </div>
              <Lock className="size-3.5 shrink-0 text-text-tertiary" />
            </li>
          );
        })}
      </ul>
    </DapCard>
  );
}

function ModuleListItem({
  module,
  status,
  isCompleted,
}: {
  module: ModuleRow;
  status: WeekStatus;
  isCompleted: boolean;
}) {
  const href = module.block
    ? `/fases/${module.block.slug}/modulos/${module.slug}`
    : "/fases";
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 hover:border-white/[0.12] hover:bg-white/[0.04]"
      >
        <div className="min-w-0">
          <p className="truncate font-grotesk text-sm font-medium text-text-primary">
            Semana {module.course_week} · {module.title}
          </p>
          {module.block && (
            <p className="truncate font-inter text-xs text-text-tertiary">
              {module.block.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="size-4 text-emerald-400" />
          ) : status === "review" ? (
            <span className="font-inter text-xs text-text-tertiary">Repaso</span>
          ) : null}
          <ArrowRight className="size-3.5 text-text-tertiary group-hover:text-brand-coral" />
        </div>
      </Link>
    </li>
  );
}

function SubscriptionPanel({
  cancelDate,
  nextBillDate,
  isAdmin,
}: {
  cancelDate: string | null;
  nextBillDate: string | null;
  isAdmin: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>Recursos</DapCardTitle>
          <DapCardDescription>
            Más allá del módulo de la semana.
          </DapCardDescription>
        </DapCardHeader>
        <ul className="mt-4 space-y-3 font-inter text-sm">
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/comunidad"
              className="text-text-primary hover:text-brand-coral"
            >
              Comunidad de pastores en formación
            </Link>
          </li>
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/en-vivo"
              className="text-text-primary hover:text-brand-coral"
            >
              Próximas MasterClass y mentorías en vivo
            </Link>
          </li>
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/tutor"
              className="text-text-primary hover:text-brand-coral"
            >
              Tutor IA — preguntá sobre cualquier doctrina del DAP
            </Link>
          </li>
          {isAdmin && (
            <li className="flex items-center gap-3">
              <ArrowRight className="size-3.5 text-brand-violet" />
              <Link
                href="/admin"
                className="text-text-primary hover:text-brand-violet"
              >
                Panel de administración
              </Link>
            </li>
          )}
        </ul>
      </DapCard>

      <aside className="space-y-4">
        <DapCard>
          <h3 className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
            Tu suscripción
          </h3>
          <p className="mt-2 font-grotesk text-h4 font-semibold text-text-primary">
            Activa
          </p>
          <p className="mt-1 font-inter text-xs text-text-secondary">
            {cancelDate
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

        <div className="relative overflow-hidden rounded-xl border border-brand-violet/20 bg-brand-violet/[0.04] p-5">
          <Sparkles
            className="mb-2 size-5 text-brand-coral"
            strokeWidth={1.8}
          />
          <p className="font-grotesk text-sm font-semibold text-text-primary">
            Tutor IA disponible
          </p>
          <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
            Resolvé dudas doctrinales 24/7.
          </p>
          <DapButton
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start px-0"
            render={<Link href="/tutor" />}
          >
            Abrir tutor
            <ArrowRight />
          </DapButton>
        </div>
      </aside>
    </div>
  );
}

// Importado al inicio. Lo dejamos exportado nominal para que GraduationCap
// no se reporte como unused si lo introducimos en otra iteración.
void GraduationCap;
void weekStatus;
