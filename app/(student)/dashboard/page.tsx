import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import {
  formatBillingDate,
  loadProfile,
  loadSubscription,
  loadWeekDashboardData,
} from "@/lib/student/dashboard-data";

import { DapStudentShell } from "@/components/layouts/dap-student-shell";
import { DapCard } from "@/components/ui-dap/card";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { NoSubscriptionState } from "@/components/student/dashboard/no-sub-state";
import { NotStartedYet } from "@/components/student/dashboard/not-started";
import { CurrentWeekCard } from "@/components/student/dashboard/current-week-card";
import { ProgressBar } from "@/components/student/dashboard/progress-bar";
import {
  PastModulesList,
  UpcomingModulesList,
} from "@/components/student/dashboard/module-lists";
import { SubscriptionPanel } from "@/components/student/dashboard/subscription-panel";

// Force dynamic — el dashboard depende de auth (cookies) y del estado
// de subscription en DB. Sin esto Next 16 puede cachear y mostrar el
// estado "sin suscripción" después de un pago recién procesado.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("dashboard.metaTitle") };
}

/**
 * Dashboard del alumno. 3 estados posibles:
 *
 *   1. Sin sub (nunca pagó o canceló) → <NoSubscriptionState>
 *   2. Sub activa pero program_start_date no llegó → <NotStartedYet>
 *      (admin sin date, o aspirante esperando primer martes)
 *   3. Sub activa + arrancó el programa → <WeekDashboard>
 *      (módulo actual + progreso + pasados + próximos + sub panel)
 *
 * Data fetching delegado a lib/student/dashboard-data.ts. UI atómica
 * vive en components/student/dashboard/.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("Student");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const profile = await loadProfile(supabase, user.id);
  const firstName = profile.full_name.split(" ")[0];
  const { sub, hasActive, isPastoralAr } = await loadSubscription(supabase, user.id);

  // Fase 2: Beca de Honor vigente — banner en dashboard.
  // Solo mostrar para type='honor' (becados reales). Otros types como
  // 'pastoral_mx' viven en la misma tabla pero representan cobro pastoral
  // off-system, NO una beca — mostrarles "Beca vigente" sería incorrecto.
  const { data: honorScholarship } = await supabase
    .from("honor_scholarships")
    .select("status, start_date, end_date")
    .eq("user_id", user.id)
    .eq("scholarship_type", "honor")
    .in("status", ["vigente", "proxima_vencer"])
    .limit(1)
    .maybeSingle<{ status: string; start_date: string; end_date: string | null }>();

  return (
    <DapStudentShell
      userName={profile.full_name}
      userAvatar={profile.avatar_url}
      title={t("dashboard.topbarTitle")}
      onSignOut={signOutAction}
    >
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {honorScholarship && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">⭐</span>
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
                  Beca de Honor vigente
                </p>
                <p className="text-sm leading-relaxed text-amber-50">
                  Estás liberado del pago de mensualidades mientras tu beca esté activa.
                  Solo se te pide mantener tu participación y avance académico.
                </p>
              </div>
            </div>
          </div>
        )}
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
            isPastoralAr={isPastoralAr}
          />
        )}
      </div>
    </DapStudentShell>
  );
}

async function WeekDashboard({
  firstName,
  isAdmin,
  programStartDate,
  matricula,
  cancelDate,
  nextBillDate,
  userId,
  isPastoralAr,
}: {
  firstName: string;
  isAdmin: boolean;
  programStartDate: string | null;
  matricula: string | null;
  cancelDate: string | null;
  nextBillDate: string | null;
  isPastoralAr: boolean;
  userId: string;
}) {
  const supabase = await createClient();
  const t = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;

  const data = await loadWeekDashboardData(supabase, userId);

  // 1) Aún no arrancó el programa
  if (data.currentWeek === 0) {
    return (
      <NotStartedYet
        firstName={firstName}
        programStartDate={programStartDate}
        matricula={matricula}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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
              currentWeek: data.currentWeek,
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

      <div data-tour="current-module">
        {data.currentModule ? (
          <CurrentWeekCard
            locale={locale}
            module={data.currentModule}
            isCompleted={
              data.progressById.get(data.currentModule.id) === true
            }
            closesAt={data.closesAt}
          />
        ) : (
          <DapCard>
            <p className="text-sm text-text-secondary">
              {t("dashboard.week.noModule")}
            </p>
          </DapCard>
        )}
      </div>

      <div data-tour="progress">
        <ProgressBar
          completedCount={data.completedCount}
          completionPct={data.completionPct}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PastModulesList
          locale={locale}
          modules={data.pastModules}
          progressById={data.progressById}
        />
        <div data-tour="upcoming">
          <UpcomingModulesList
            locale={locale}
            modules={data.upcomingModules}
            programStartDate={programStartDate}
          />
        </div>
      </div>

      <div data-tour="resources">
        <SubscriptionPanel
          cancelDate={cancelDate}
          nextBillDate={nextBillDate}
          isAdmin={isAdmin}
          isPastoralAr={isPastoralAr}
        />
      </div>

      <DashboardTour />
    </div>
  );
}
