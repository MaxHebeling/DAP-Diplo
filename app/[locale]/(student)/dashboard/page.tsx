import { getTranslations, getLocale } from "next-intl/server";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  Sparkles,
} from "lucide-react";

import { Link, redirect } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import {
  DAP_TZ,
  estimateWeekOpensAt,
  formatDapDateTime,
  formatDapLongDate,
  weekStatus,
  type WeekStatus,
} from "@/lib/calendar/week";

import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { DapStudentShell } from "@/components/layouts/dap-student-shell";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";

// Force dynamic — el dashboard depende de auth (cookies) y del estado
// de subscription en DB. Sin esto Next 16 puede cachear y mostrar el
// estado "sin suscripción" después de un pago recién procesado.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("dashboard.metaTitle") };
}

type Translator = Awaited<ReturnType<typeof getTranslations>>;

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
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  course_week: number;
  block: {
    slug: string;
    title: string;
    title_en: string | null;
    order_index: number;
  } | null;
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
  const t = await getTranslations("Student");
  const locale = await getLocale();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/login?redirectTo=/dashboard", locale });

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
      title={t("dashboard.topbarTitle")}
      onSignOut={signOutAction}
    >
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {!hasActive ? (
          <NoSubscriptionState
            t={t}
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
  t,
  firstName,
  hadCanceledSub,
}: {
  t: Translator;
  firstName: string;
  hadCanceledSub: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
          {t("common.diplomaEyebrow")}
        </p>
        <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
          {t("dashboard.greeting", { firstName })}
        </h1>
        <p className="mt-3 font-inter text-base leading-relaxed text-text-secondary">
          {hadCanceledSub
            ? t("dashboard.noSub.canceled")
            : t("dashboard.noSub.inactive")}
        </p>
      </header>

      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.noSub.cardTitle")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.noSub.cardDescription")}
          </DapCardDescription>
        </DapCardHeader>
        <div className="mt-4">
          <EnrollmentCTA href="/suscribirme" size="lg">
            {t("dashboard.noSub.cta")}
            <ArrowRight />
          </EnrollmentCTA>
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
  const t = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;

  // 1) Semana actual + ventana
  const { data: weekWindowData } = await supabase
    .rpc("current_week_window", { p_user_id: userId })
    .single<WeekWindowRow>();

  const currentWeek = weekWindowData?.course_week ?? 0;

  // 2) Si todavía no arrancó (admin sin program_start_date o futuro)
  if (currentWeek === 0) {
    return (
      <NotStartedYet
        t={t}
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
      "id, slug, title, title_en, subtitle, subtitle_en, course_week, block:blocks(slug, title, title_en, order_index)",
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
            {t("common.diplomaEyebrow")}
          </p>
          <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
            {t("dashboard.greeting", { firstName })}
          </h1>
          <p className="mt-3 font-inter text-base text-text-secondary">
            {t.rich("dashboard.week.status", {
              currentWeek,
              strong: (chunks) => (
                <span className="font-semibold text-text-primary">{chunks}</span>
              ),
            })}
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
            t={t}
            locale={locale}
            module={currentModule}
            isCompleted={progressById.get(currentModule.id) === true}
            closesAt={closesAt}
          />
        ) : (
          <DapCard>
            <p className="text-sm text-text-secondary">
              {t("dashboard.week.noModule")}
            </p>
          </DapCard>
        )}
      </div>

      {/* Progreso global */}
      <div data-tour="progress">
        <ProgressBar
          t={t}
          completedCount={completedCount}
          completionPct={completionPct}
        />
      </div>

      {/* Módulos pasados + próximos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PastModulesList
          t={t}
          locale={locale}
          modules={pastModules}
          progressById={progressById}
        />
        <div data-tour="upcoming">
          <UpcomingModulesList
            t={t}
            locale={locale}
            modules={upcomingModules}
            programStartDate={programStartDate}
          />
        </div>
      </div>

      {/* Subscripción */}
      <div data-tour="resources">
        <SubscriptionPanel
          t={t}
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
  t,
  firstName,
  programStartDate,
  matricula,
  isAdmin,
}: {
  t: Translator;
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
          {t("common.diplomaEyebrow")}
        </p>
        <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
          {t("dashboard.welcome", { firstName })}
        </h1>
        {isAdmin && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-0.5 font-inter text-xs font-medium text-brand-violet">
            {t("dashboard.admin")}
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
              {t("dashboard.notStarted.cardTitle")}
            </h2>
            {startsAt ? (
              <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
                {t.rich("dashboard.notStarted.startsOn", {
                  startsAt,
                  strong: (chunks) => (
                    <span className="font-semibold text-text-primary">
                      {chunks}
                    </span>
                  ),
                })}
              </p>
            ) : (
              <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
                {t("dashboard.notStarted.noDate")}
              </p>
            )}
            {matricula && (
              <p className="mt-3 font-mono text-xs text-text-tertiary">
                {t("dashboard.notStarted.matricula", { matricula })}
              </p>
            )}
          </div>
        </div>
      </DapCard>

      <p className="font-inter text-xs text-text-tertiary">
        {t.rich("dashboard.notStarted.explore", {
          community: (chunks) => (
            <Link href="/comunidad" className="text-brand-coral hover:underline">
              {chunks}
            </Link>
          ),
          tutor: (chunks) => (
            <Link href="/tutor" className="text-brand-coral hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

function CurrentWeekCard({
  t,
  locale,
  module,
  isCompleted,
  closesAt,
}: {
  t: Translator;
  locale: Locale;
  module: ModuleRow;
  isCompleted: boolean;
  closesAt: Date | null;
}) {
  const moduleTitle = localized(module, "title", locale) ?? module.title;
  const moduleSubtitle = localized(module, "subtitle", locale);
  const blockTitle = module.block
    ? localized(module.block, "title", locale) ?? module.block.title
    : null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-coral/25 bg-gradient-to-br from-brand-violet/[0.10] via-surface-elevated to-brand-coral/[0.06] p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-coral/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("dashboard.currentCard.eyebrow", { week: module.course_week })}
          </p>
          <h2 className="mt-2 font-grotesk text-h2 font-bold leading-tight text-text-primary">
            {moduleTitle}
          </h2>
          {moduleSubtitle && (
            <p className="mt-1 font-inter text-sm text-text-secondary">
              {moduleSubtitle}
            </p>
          )}
          {module.block && (
            <p className="mt-3 font-inter text-xs text-text-tertiary">
              {t("dashboard.currentCard.block", {
                order: String(module.block.order_index).padStart(2, "0"),
                title: blockTitle ?? module.block.title,
              })}
            </p>
          )}
          {closesAt && !isCompleted && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 font-inter text-xs text-text-secondary">
              <Clock className="size-3.5 text-brand-coral" />
              {t("dashboard.currentCard.taskCloses", {
                date: formatDapDateTime(closesAt),
              })}
            </p>
          )}
          {isCompleted && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 font-inter text-xs text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              {t("dashboard.currentCard.completed")}
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
          {isCompleted ? t("common.review") : t("common.continue")}
          <ArrowRight />
        </DapButton>
      </div>
    </div>
  );
}

function ProgressBar({
  t,
  completedCount,
  completionPct,
}: {
  t: Translator;
  completedCount: number;
  completionPct: number;
}) {
  return (
    <DapCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
            {t("dashboard.progress.label")}
          </p>
          <p className="mt-1 font-grotesk text-h3 font-semibold text-text-primary">
            {t.rich("dashboard.progress.count", {
              count: completedCount,
              muted: (chunks) => (
                <span className="text-text-secondary">{chunks}</span>
              ),
            })}
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
  t,
  locale,
  modules,
  progressById,
}: {
  t: Translator;
  locale: Locale;
  modules: ModuleRow[];
  progressById: Map<string, boolean>;
}) {
  if (modules.length === 0) {
    return (
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.past.title")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.past.emptyDescription")}
          </DapCardDescription>
        </DapCardHeader>
      </DapCard>
    );
  }
  return (
    <DapCard>
      <DapCardHeader>
        <DapCardTitle>{t("dashboard.past.titleFull")}</DapCardTitle>
        <DapCardDescription>
          {t("dashboard.past.description")}
        </DapCardDescription>
      </DapCardHeader>
      <ul className="mt-4 space-y-2">
        {modules.map((m) => (
          <ModuleListItem
            key={m.id}
            t={t}
            locale={locale}
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
  t,
  locale,
  modules,
  programStartDate,
}: {
  t: Translator;
  locale: Locale;
  modules: ModuleRow[];
  programStartDate: string | null;
}) {
  if (modules.length === 0) {
    return (
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.upcoming.title")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.upcoming.emptyDescription")}
          </DapCardDescription>
        </DapCardHeader>
      </DapCard>
    );
  }
  return (
    <DapCard>
      <DapCardHeader>
        <DapCardTitle>{t("dashboard.upcoming.titleFull")}</DapCardTitle>
        <DapCardDescription>
          {t("dashboard.upcoming.description")}
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
                  {t("dashboard.listItem.weekTitle", {
                    week: m.course_week,
                    title: localized(m, "title", locale) ?? m.title,
                  })}
                </p>
                {opensAt && (
                  <p className="font-inter text-xs text-text-tertiary">
                    {t("dashboard.upcoming.opensAt", {
                      date: formatDapLongDate(opensAt),
                    })}
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
  t,
  locale,
  module,
  status,
  isCompleted,
}: {
  t: Translator;
  locale: Locale;
  module: ModuleRow;
  status: WeekStatus;
  isCompleted: boolean;
}) {
  const href = module.block
    ? `/fases/${module.block.slug}/modulos/${module.slug}`
    : "/fases";
  const moduleTitle = localized(module, "title", locale) ?? module.title;
  const blockTitle = module.block
    ? localized(module.block, "title", locale) ?? module.block.title
    : null;
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 hover:border-white/[0.12] hover:bg-white/[0.04]"
      >
        <div className="min-w-0">
          <p className="truncate font-grotesk text-sm font-medium text-text-primary">
            {t("dashboard.listItem.weekTitle", {
              week: module.course_week,
              title: moduleTitle,
            })}
          </p>
          {module.block && (
            <p className="truncate font-inter text-xs text-text-tertiary">
              {blockTitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="size-4 text-emerald-400" />
          ) : status === "review" ? (
            <span className="font-inter text-xs text-text-tertiary">
              {t("dashboard.listItem.review")}
            </span>
          ) : null}
          <ArrowRight className="size-3.5 text-text-tertiary group-hover:text-brand-coral" />
        </div>
      </Link>
    </li>
  );
}

function SubscriptionPanel({
  t,
  cancelDate,
  nextBillDate,
  isAdmin,
}: {
  t: Translator;
  cancelDate: string | null;
  nextBillDate: string | null;
  isAdmin: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.resources.title")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.resources.description")}
          </DapCardDescription>
        </DapCardHeader>
        <ul className="mt-4 space-y-3 font-inter text-sm">
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/comunidad"
              className="text-text-primary hover:text-brand-coral"
            >
              {t("dashboard.resources.community")}
            </Link>
          </li>
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/en-vivo"
              className="text-text-primary hover:text-brand-coral"
            >
              {t("dashboard.resources.live")}
            </Link>
          </li>
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/tutor"
              className="text-text-primary hover:text-brand-coral"
            >
              {t("dashboard.resources.tutor")}
            </Link>
          </li>
          {isAdmin && (
            <li className="flex items-center gap-3">
              <ArrowRight className="size-3.5 text-brand-violet" />
              <Link
                href="/admin"
                className="text-text-primary hover:text-brand-violet"
              >
                {t("dashboard.resources.admin")}
              </Link>
            </li>
          )}
        </ul>
      </DapCard>

      <aside className="space-y-4">
        <DapCard>
          <h3 className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
            {t("dashboard.subscription.label")}
          </h3>
          <p className="mt-2 font-grotesk text-h4 font-semibold text-text-primary">
            {t("dashboard.subscription.active")}
          </p>
          <p className="mt-1 font-inter text-xs text-text-secondary">
            {cancelDate
              ? t("dashboard.subscription.cancelsOn", { date: cancelDate })
              : nextBillDate
                ? t("dashboard.subscription.nextBill", { date: nextBillDate })
                : "—"}
          </p>
          <form action="/api/billing/portal" method="POST" className="mt-4">
            <DapButton
              type="submit"
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {t("dashboard.subscription.manage")}
            </DapButton>
          </form>
        </DapCard>

        <div className="relative overflow-hidden rounded-xl border border-brand-violet/20 bg-brand-violet/[0.04] p-5">
          <Sparkles
            className="mb-2 size-5 text-brand-coral"
            strokeWidth={1.8}
          />
          <p className="font-grotesk text-sm font-semibold text-text-primary">
            {t("dashboard.tutorPromo.title")}
          </p>
          <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
            {t("dashboard.tutorPromo.description")}
          </p>
          <DapButton
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start px-0"
            render={<Link href="/tutor" />}
          >
            {t("dashboard.tutorPromo.open")}
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
