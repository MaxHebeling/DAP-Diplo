import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ModuleSidebar, type SidebarModule } from "@/components/module/sidebar";
import {
  ModuleStepper,
  type SectionKind,
  type StepperSection,
} from "@/components/module/stepper";
import { SectionContent } from "@/components/module/section-content";
import { SectionTeaching } from "@/components/module/section-teaching";
import type {
  PlayerQuestion,
  PlayerQuiz,
} from "@/components/module/quiz-player";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import { ensureWeekAssignment } from "@/lib/calendar/ensure-assignment";
import { signMuxPlayerTokens } from "@/lib/mux/playback";
import { ModuleQuickActions } from "@/components/module/module-quick-actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { GoToTaskButton } from "@/components/module/go-to-task-button";

const SECTION_KINDS: SectionKind[] = [
  "intro",
  "teaching",
  "activation",
  "evaluation",
  "impartation",
];

const SECTION_TITLE_KEY: Record<SectionKind, string> = {
  intro: "module.sectionIntro",
  teaching: "module.sectionTeaching",
  activation: "module.sectionActivation",
  evaluation: "module.sectionEvaluation",
  impartation: "module.sectionImpartation",
};

type PageProps = {
  params: Promise<{ slug: string; moduleSlug: string }>;
  searchParams: Promise<{ section?: string }>;
};

type DbSectionProgress = { completed: boolean | null; last_position_seconds: number | null };
type DbSection = {
  id: string;
  kind: SectionKind;
  order_index: number;
  title: string;
  title_en: string | null;
  body_md: string | null;
  body_md_en: string | null;
  mux_playback_id: string | null;
  duration_seconds: number | null;
  progress: DbSectionProgress[] | null;
};
type DbResource = {
  id: string;
  title: string;
  kind: "pdf" | "audio" | "link" | "slides" | "other";
  url: string;
  order_index: number;
  locale: "es" | "en";
};
type DbModule = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  description: string | null;
  description_en: string | null;
  objective: string | null;
  objective_en: string | null;
  main_revelation: string | null;
  main_revelation_en: string | null;
  impartation_phrase: string | null;
  impartation_phrase_en: string | null;
  duration_minutes: number | null;
  course_week: number | null;
  phase: {
    id: string;
    slug: string;
    order_index: number;
    title: string;
    title_en: string | null;
    published: boolean;
  } | null;
  sections: DbSection[] | null;
  resources: DbResource[] | null;
};

export async function generateMetadata({ params }: PageProps) {
  const { moduleSlug } = await params;
  const t = await getTranslations("Student");
  return {
    title: t("module.metaTitle", { slug: moduleSlug }),
  };
}

export default async function ModulePlayerPage({
  params,
  searchParams,
}: PageProps) {
  const { slug: phaseSlug, moduleSlug } = await params;
  const { section: sectionParam } = await searchParams;
  const currentSection: SectionKind = SECTION_KINDS.includes(
    sectionParam as SectionKind,
  )
    ? (sectionParam as SectionKind)
    : "intro";

  const t = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();

  // 1) Auth (esta ruta no está en proxy.ts PROTECTED_PREFIXES → check manual)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect({
      href: `/login?redirectTo=/fases/${phaseSlug}/modulos/${moduleSlug}?section=${currentSection}`,
      locale,
    });
  }

  // 2) Perfil para header + check admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  // 3) Módulo + fase + secciones + recursos + progreso (filtrado por RLS self)
  const { data: mod, error: modErr } = await supabase
    .from("modules")
    .select(
      `id, slug, title, title_en, subtitle, subtitle_en, description, description_en,
       objective, objective_en, main_revelation, main_revelation_en,
       impartation_phrase, impartation_phrase_en, duration_minutes, course_week,
       phase:phases(id, slug, order_index, title, title_en, published),
       sections:module_sections(
         id, kind, order_index, title, title_en, body_md, body_md_en,
         mux_playback_id, duration_seconds,
         progress:section_progress(completed, last_position_seconds)
       ),
       resources:module_resources(id, title, kind, url, order_index, locale)`,
    )
    .eq("slug", moduleSlug)
    .maybeSingle<DbModule>();

  if (modErr) {
    throw new Error(`No se pudo cargar el módulo: ${modErr.message}`);
  }
  if (!mod || !mod.phase || mod.phase.slug !== phaseSlug) notFound();

  // 4) Block published / admin override
  if (!mod.phase.published && !isAdmin) notFound();

  // 5) Gating v3.3: has_access_to_module verifica suscripción activa
  //    Y que course_week <= semana actual del alumno (calendario semanal).
  //    También cubre is_admin internamente.
  const { data: hasAccess } = await supabase.rpc("has_access_to_module", {
    p_module_id: mod.id,
  });
  if (!hasAccess && !isAdmin) {
    redirect({ href: `/fases/${phaseSlug}?toast=module-locked`, locale });
  }

  // 6) Sidebar: módulos hermanos + progreso
  const { data: siblings } = await supabase
    .from("modules")
    .select(
      "id, slug, order_index, title, title_en, module_progress(completed)",
    )
    .eq("phase_id", mod.phase.id)
    .order("order_index", { ascending: true });

  const sidebarModules: SidebarModule[] = (siblings ?? []).map(
    (s: {
      id: string;
      slug: string;
      order_index: number;
      title: string;
      title_en: string | null;
      module_progress: { completed: boolean | null }[] | null;
    }) => ({
      id: s.id,
      slug: s.slug,
      order_index: s.order_index,
      title: localized(s, "title", locale) ?? s.title,
      completed: !!s.module_progress?.[0]?.completed,
    }),
  );

  // 7) Secciones del stepper (orden canónico por order_index)
  const sectionsByKind = new Map<SectionKind, DbSection>();
  for (const s of mod.sections ?? []) sectionsByKind.set(s.kind, s);

  const stepperSections: StepperSection[] = SECTION_KINDS.map((kind) => {
    const s = sectionsByKind.get(kind);
    const completed = !!s?.progress?.[0]?.completed;
    return {
      kind,
      title: t(SECTION_TITLE_KEY[kind]),
      completed,
    };
  });

  const activeSection = sectionsByKind.get(currentSection);
  if (!activeSection) {
    // El trigger de 0001 crea las 5 secciones por módulo. Si falta alguna
    // es un bug de seed. Tirar 404.
    notFound();
  }

  const startPosition = activeSection.progress?.[0]?.last_position_seconds ?? 0;
  const teachingAlreadyCompleted =
    !!sectionsByKind.get("teaching")?.progress?.[0]?.completed;

  // v3.3: si el alumno entra a la sección activation del módulo de su
  // semana actual, garantizamos que exista su assignment_submission con
  // la ventana semanal calculada. Idempotente: SELECT primero, luego
  // INSERT con la window de la DB.
  if (
    currentSection === "activation" &&
    mod.course_week != null &&
    !isAdmin
  ) {
    await ensureWeekAssignment({
      supabase,
      userId: user.id,
      moduleId: mod.id,
      sectionId: activeSection.id,
      courseWeek: mod.course_week,
    });
  }

  // Cargar la submission del alumno para esta activation (si existe)
  // — la usamos para renderizar el form de entrega o el feedback IA.
  let activationSubmission: {
    id: string;
    status: "open" | "submitted" | "correcting" | "completed" | "incomplete" | "not_submitted";
    content_text: string | null;
    opens_at: string;
    closes_at: string;
    submitted_at: string | null;
    ai_feedback: string | null;
    ai_score: number | null;
    ai_passed: boolean | null;
    corrected_at: string | null;
    results_sent_at: string | null;
  } | null = null;
  // Para el banner de acciones rápidas: indica si el alumno ya entregó.
  // Aplica solo a section activation. Query liviana — solo el status.
  let hasSubmittedActivation = false;
  const activationSectionForBanner = sectionsByKind.get("activation");
  if (activationSectionForBanner && !isAdmin) {
    const { data: anySubmitted } = await supabase
      .from("assignment_submissions")
      .select("status")
      .eq("user_id", user.id)
      .eq("module_section_id", activationSectionForBanner.id)
      .in("status", ["submitted", "corrected", "completed"])
      .limit(1)
      .maybeSingle<{ status: string }>();
    hasSubmittedActivation = !!anySubmitted;
  }

  if (currentSection === "activation") {
    const { data: subData } = await supabase
      .from("assignment_submissions")
      .select(
        "id, status, content_text, opens_at, closes_at, submitted_at, ai_feedback, ai_score, ai_passed, corrected_at, results_sent_at",
      )
      .eq("user_id", user.id)
      .eq("module_section_id", activeSection.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subData) {
      activationSubmission = subData as unknown as typeof activationSubmission;
    }
  }

  // Carga del quiz solo si estamos viendo la sección de evaluación
  let evaluationQuiz: PlayerQuiz | null = null;
  let evaluationQuestions: PlayerQuestion[] = [];
  let evaluationAttemptCount = 0;
  let evaluationBestScore: number | null = null;
  let evaluationPassed = false;
  let evaluationLatestAttempt: {
    id: string;
    reveal_at: string | null;
    revealed_at: string | null;
  } | null = null;
  if (currentSection === "evaluation") {
    const { data: q } = await supabase
      .from("quizzes")
      .select(
        "id, title, description, pass_threshold, max_attempts, shuffle_questions",
      )
      .eq("module_section_id", activeSection.id)
      .maybeSingle<PlayerQuiz>();
    if (q) {
      evaluationQuiz = q;
      const { data: qs } = await supabase
        .from("quiz_questions")
        .select("id, prompt, kind, payload, order_index")
        .eq("quiz_id", q.id)
        .order("order_index", { ascending: true })
        .returns<
          {
            id: string;
            prompt: string;
            kind: "multiple_choice" | "true_false";
            payload: Record<string, unknown>;
            order_index: number;
          }[]
        >();
      evaluationQuestions = (qs ?? []).map((row) => ({
        id: row.id,
        prompt: row.prompt,
        kind: row.kind,
        // El alumno NUNCA recibe correct_index/correct. Solo options visibles.
        options:
          row.kind === "multiple_choice"
            ? ((row.payload?.options as string[] | undefined) ?? [])
            : undefined,
      }));

      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id, score_percent, passed, reveal_at, revealed_at, submitted_at")
        .eq("user_id", user.id)
        .eq("quiz_id", q.id)
        .order("submitted_at", { ascending: false })
        .returns<
          {
            id: string;
            score_percent: number;
            passed: boolean;
            reveal_at: string | null;
            revealed_at: string | null;
            submitted_at: string | null;
          }[]
        >();
      evaluationAttemptCount = attempts?.length ?? 0;
      // "passed" para mostrar QuizAlreadyPassed solo si hay un attempt
      // REVELADO que pasó. Si todavía está pendiente de reveal, no
      // mostramos la vista de "ya aprobado".
      evaluationPassed = (attempts ?? []).some(
        (a) => a.passed && a.revealed_at !== null,
      );
      evaluationBestScore =
        attempts && attempts.length > 0
          ? Math.max(...attempts.map((a) => a.score_percent))
          : null;
      // El más reciente para el flow pending/reveal del QuizPlayer.
      const latest = attempts?.[0];
      if (latest) {
        evaluationLatestAttempt = {
          id: latest.id,
          reveal_at: latest.reveal_at,
          revealed_at: latest.revealed_at,
        };
      }
    }
  }

  // El acceso al módulo ya fue validado más arriba (RLS / has_access_to_module).
  // Si hay video, generamos tokens signed cortos (6h) para el reproductor.
  let muxTokens: Awaited<ReturnType<typeof signMuxPlayerTokens>> | null = null;
  if (activeSection?.mux_playback_id) {
    try {
      muxTokens = await signMuxPlayerTokens(activeSection.mux_playback_id);
    } catch (err) {
      console.error("[module] failed to sign Mux tokens:", err);
    }
  }

  // Valores localizados para el render (slug/kind/IDs quedan en base).
  const moduleTitle = localized(mod, "title", locale) ?? mod.title;
  const moduleSubtitle = localized(mod, "subtitle", locale);
  const phaseTitle = localized(mod.phase, "title", locale) ?? mod.phase.title;
  const activeBodyMd = localized(activeSection, "body_md", locale);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface-base text-text-primary lg:grid-cols-[300px_1fr]">
      <ModuleSidebar
        phaseTitle={phaseTitle}
        phaseOrderIndex={mod.phase.order_index}
        phaseSlug={mod.phase.slug}
        modules={sidebarModules}
        currentModuleSlug={mod.slug}
      />

      <div className="flex min-h-screen flex-col">
        {/* Top bar mini — responsive, en línea con el shell del portal */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-white/[0.06] bg-surface-base/85 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          {/* Breadcrumb compacto en mobile, completo en desktop */}
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
          >
            <Link
              href={`/fases/${mod.phase.slug}`}
              className="inline-flex shrink-0 items-center gap-1 hover:text-foreground sm:hidden"
            >
              <ArrowLeft className="size-3.5" />
              <span className="font-medium">
                {t("module.breadcrumbBlock", {
                  order: String(mod.phase.order_index).padStart(2, "0"),
                })}
              </span>
            </Link>
            <Link href="/dashboard" className="hidden hover:text-foreground sm:inline">
              {t("module.breadcrumbDiploma")}
            </Link>
            <span className="hidden text-border sm:inline">/</span>
            <Link
              href={`/fases/${mod.phase.slug}`}
              className="hidden hover:text-foreground sm:inline"
            >
              {t("module.breadcrumbBlock", {
                order: String(mod.phase.order_index).padStart(2, "0"),
              })}
            </Link>
            <span className="hidden text-border sm:inline">/</span>
            <span className="hidden truncate text-foreground sm:inline">
              {moduleTitle}
            </span>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Logo size="sm" />
            <SignOutButton variant="ghost" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-3xl">
            <Link
              href={`/fases/${mod.phase.slug}`}
              className="mb-6 hidden items-center gap-2 text-xs text-muted-foreground hover:text-brand-coral sm:inline-flex"
            >
              <ArrowLeft className="size-3.5" />
              {t("module.backToBlock")}
            </Link>

            <header className="mb-8">
              {moduleSubtitle && (
                <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.4em] text-brand-coral">
                  {moduleSubtitle}
                </p>
              )}
              <h1 className="bg-gradient-to-br from-white via-white/95 to-white/70 bg-clip-text font-grotesk text-3xl font-bold leading-tight text-transparent sm:text-4xl">
                {moduleTitle}
              </h1>
              <p className="mt-2 font-inter text-sm text-text-secondary">
                {t("module.duration", { minutes: mod.duration_minutes ?? 50 })}
              </p>
            </header>

            {/* Banner sticky de acciones del módulo: PDF + Subir tarea.
                Filtramos los resources por el locale activo del alumno;
                si no hay PDF en ese locale, hacemos fallback al otro idioma
                para no dejar al alumno sin material. */}
            <div className="mb-6">
              <ModuleQuickActions
                resources={pickResourcesForLocale(mod.resources ?? [], locale)}
                phaseSlug={mod.phase.slug}
                moduleSlug={mod.slug}
                alreadySubmitted={hasSubmittedActivation}
              />
            </div>

            <div className="mb-10">
              <ModuleStepper
                sections={stepperSections}
                current={currentSection}
                phaseSlug={mod.phase.slug}
                moduleSlug={mod.slug}
              />
            </div>

            <section aria-labelledby="section-heading">
              <h2
                id="section-heading"
                className="mb-6 font-grotesk text-2xl font-bold text-white"
              >
                {t(SECTION_TITLE_KEY[currentSection])}
              </h2>

              {currentSection === "teaching" ? (
                <SectionTeaching
                  sectionId={activeSection.id}
                  moduleId={mod.id}
                  phaseSlug={mod.phase.slug}
                  moduleSlug={mod.slug}
                  muxPlaybackId={activeSection.mux_playback_id}
                  muxTokens={muxTokens}
                  bodyMd={activeBodyMd}
                  durationSeconds={activeSection.duration_seconds}
                  startPositionSeconds={startPosition}
                  alreadyCompleted={teachingAlreadyCompleted}
                  resources={(mod.resources ?? [])
                    .slice()
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(({ id, title, kind, url }) => ({
                      id,
                      title,
                      kind,
                      url,
                    }))}
                />
              ) : (
                <SectionContent
                  kind={currentSection}
                  sectionId={activeSection.id}
                  moduleId={mod.id}
                  phaseSlug={mod.phase.slug}
                  moduleSlug={mod.slug}
                  bodyMd={activeBodyMd}
                  module={{
                    objective: localized(mod, "objective", locale),
                    main_revelation: localized(mod, "main_revelation", locale),
                    impartation_phrase: localized(
                      mod,
                      "impartation_phrase",
                      locale,
                    ),
                  }}
                  activation={
                    currentSection === "activation"
                      ? { submission: activationSubmission }
                      : undefined
                  }
                  evaluation={
                    currentSection === "evaluation"
                      ? {
                          quiz: evaluationQuiz,
                          questions: evaluationQuestions,
                          attemptCount: evaluationAttemptCount,
                          passed: evaluationPassed,
                          bestScore: evaluationBestScore,
                          latestAttempt: evaluationLatestAttempt,
                        }
                      : undefined
                  }
                />
              )}
            </section>

            {/* Footer fijo de la lección — recordatorio para el alumno:
                cualquier tarea solicitada en el PDF/secciones se trabaja
                por fuera y se sube en la sección "Tarea" del módulo. */}
            <aside className="mt-12 rounded-2xl border border-brand-coral/30 bg-gradient-to-br from-brand-coral/[0.08] via-surface-elevated to-brand-violet/[0.05] p-5 sm:p-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-coral/15 text-brand-coral">
                    <FilePlus2 className="size-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-inter text-[10px] font-bold uppercase tracking-[0.32em] text-brand-coral">
                      Recordatorio
                    </p>
                    <p className="mt-1 font-grotesk text-sm font-semibold leading-snug text-white sm:text-base">
                      Si se te solicita una tarea, hazla por fuera y súbela aquí.
                    </p>
                  </div>
                </div>
                <GoToTaskButton
                  phaseSlug={mod.phase.slug}
                  moduleSlug={mod.slug}
                />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Devuelve los recursos del módulo (PDFs, etc) en el orden canónico,
 * filtrados por el locale activo del alumno. Si el módulo no tiene
 * material en ese locale, hace fallback al otro idioma para no dejar al
 * alumno sin PDF.
 */
function pickResourcesForLocale(
  resources: DbResource[],
  locale: Locale,
): { id: string; title: string; kind: DbResource["kind"]; url: string }[] {
  const sorted = resources.slice().sort((a, b) => a.order_index - b.order_index);
  const inLocale = sorted.filter((r) => r.locale === locale);
  const pool = inLocale.length > 0 ? inLocale : sorted;
  return pool.map(({ id, title, kind, url }) => ({ id, title, kind, url }));
}
