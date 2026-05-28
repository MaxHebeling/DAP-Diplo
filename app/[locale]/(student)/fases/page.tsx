import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";

import { Link, redirect } from "@/i18n/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";

import { DapStudentShell } from "@/components/layouts/dap-student-shell";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("phases.metaTitle") };
}

type ProfileRow = {
  full_name: string;
  avatar_url: string | null;
  program_start_date: string | null;
};

type PhaseRow = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  title_en: string | null;
  brand_name: string | null;
  brand_name_en: string | null;
  promise: string | null;
  promise_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  dimension: {
    name: string;
    name_en: string | null;
    order_index: number;
  } | null;
};

type BlockModulesRow = {
  block_id: string;
  course_week: number;
  id: string;
};

type ProgressRow = {
  module_id: string;
  completed: boolean;
};

export default async function MisModulosPage() {
  const supabase = await createClient();
  const t = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/login?redirectTo=/fases", locale });

  // 6 queries independientes tras tener user.id — paralelizamos.
  // phases.id !== blocks.id (2 sets — el FK real es modules.block_id → blocks);
  // mapeamos por slug. blocks se carga para construir blockIdBySlug.
  const [
    { data: profile },
    { data: phases },
    { data: allModules },
    { data: progressRows },
    { data: currentWeek },
    { data: blocks },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, program_start_date")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("phases")
      .select(
        "id, order_index, slug, title, title_en, brand_name, brand_name_en, promise, promise_en, subtitle, subtitle_en, dimension:dimensions(name, name_en, order_index)",
      )
      .order("order_index", { ascending: true })
      .returns<PhaseRow[]>(),
    supabase
      .from("modules")
      .select("id, block_id, course_week")
      .order("course_week", { ascending: true })
      .returns<BlockModulesRow[]>(),
    supabase
      .from("module_progress")
      .select("module_id, completed")
      .eq("user_id", user.id)
      .returns<ProgressRow[]>(),
    supabase.rpc("current_program_week", { p_user_id: user.id }),
    supabase
      .from("blocks")
      .select("id, slug")
      .returns<{ id: string; slug: string }[]>(),
  ]);

  if (!profile) throw new Error("Perfil no encontrado");

  const completedByModuleId = new Map<string, boolean>(
    (progressRows ?? []).map((p) => [p.module_id, p.completed]),
  );
  const currentWeekN = typeof currentWeek === "number" ? currentWeek : 0;
  const blockIdBySlug = new Map<string, string>(
    (blocks ?? []).map((b) => [b.slug, b.id]),
  );

  const modulesByBlockId = new Map<string, BlockModulesRow[]>();
  for (const m of allModules ?? []) {
    if (!modulesByBlockId.has(m.block_id)) {
      modulesByBlockId.set(m.block_id, []);
    }
    modulesByBlockId.get(m.block_id)!.push(m);
  }

  return (
    <DapStudentShell
      userName={profile.full_name}
      userAvatar={profile.avatar_url}
      title={t("phases.topbarTitle")}
      onSignOut={signOutAction}
    >
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
            <header>
              <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                {t("phases.eyebrow")}
              </p>
              <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
                {t("phases.title")}
              </h1>
              <p className="mt-3 font-inter text-base text-text-secondary">
                {t("phases.subtitle")}
              </p>
            </header>

            <div className="dap-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(phases ?? []).map((phase) => {
                const blockId = blockIdBySlug.get(phase.slug);
                const modules = blockId
                  ? (modulesByBlockId.get(blockId) ?? [])
                  : [];
                const completed = modules.filter(
                  (m) => completedByModuleId.get(m.id) === true,
                ).length;
                const total = modules.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                // ¿Tiene algún módulo en la semana actual o pasada?
                const firstWeek = modules[0]?.course_week ?? 999;
                const lastWeek = modules[modules.length - 1]?.course_week ?? 0;
                const isLocked = currentWeekN > 0 && firstWeek > currentWeekN;
                const isCompleted = completed === total && total > 0;

                const dimN = String(
                  phase.dimension?.order_index ?? phase.order_index,
                ).padStart(2, "0");
                const dimName =
                  (phase.dimension
                    ? localized(phase.dimension, "name", locale)
                    : null) ?? t("phases.dimensionFallback");
                const phaseTitle = localized(phase, "title", locale) ?? phase.title;
                const heroTitle =
                  localized(phase, "brand_name", locale) ?? phaseTitle;
                const phaseSubtitle = localized(phase, "subtitle", locale);
                const phasePromise = localized(phase, "promise", locale);

                return (
                  <Link
                    key={phase.id}
                    href={`/fases/${phase.slug}`}
                    className="group relative flex flex-col rounded-xl border border-white/[0.06] bg-surface-elevated/60 p-6 transition-all hover:-translate-y-0.5 hover:border-brand-violet/30 hover:bg-surface-elevated"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-coral">
                        {t("phases.dimension", { num: dimN, name: dimName })}
                      </p>
                      {isCompleted ? (
                        <CheckCircle2 className="size-5 text-emerald-400" />
                      ) : isLocked ? (
                        <Lock className="size-5 text-text-tertiary" />
                      ) : null}
                    </div>

                    <h3 className="font-grotesk text-h3 font-bold gradient-text leading-tight">
                      {heroTitle}
                    </h3>
                    {phaseSubtitle && (
                      <p className="mt-1 font-inter text-sm text-text-secondary">
                        {phaseSubtitle}
                      </p>
                    )}
                    {phasePromise && (
                      <p className="mt-3 font-inter text-sm italic leading-relaxed text-text-primary/85">
                        {phasePromise}
                      </p>
                    )}

                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between font-inter text-xs text-text-tertiary">
                        <span>
                          {t("phases.modulesCount", { completed, total })}
                        </span>
                        <span className="text-brand-coral">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-coral transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="font-inter text-xs text-text-tertiary">
                        {t("phases.blockWeeks", {
                          order: String(phase.order_index).padStart(2, "0"),
                          first: firstWeek,
                          last: lastWeek,
                        })}
                      </p>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-1.5 font-inter text-sm font-medium text-brand-coral transition-all group-hover:gap-2">
                      {t("phases.viewBlock")}
                      <ArrowRight className="size-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
        </div>
      </div>
    </DapStudentShell>
  );
}

