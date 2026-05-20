import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { ensureWeekAssignment } from "@/lib/calendar/ensure-assignment";

const SECTION_KINDS: SectionKind[] = [
  "intro",
  "teaching",
  "activation",
  "evaluation",
  "impartation",
];

const SECTION_TITLE: Record<SectionKind, string> = {
  intro: "Introducción",
  teaching: "Enseñanza",
  activation: "Activación",
  evaluation: "Evaluación",
  impartation: "Frase de impartición",
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
  body_md: string | null;
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
};
type DbModule = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  objective: string | null;
  main_revelation: string | null;
  impartation_phrase: string | null;
  duration_minutes: number | null;
  course_week: number | null;
  phase: {
    id: string;
    slug: string;
    order_index: number;
    title: string;
    published: boolean;
  } | null;
  sections: DbSection[] | null;
  resources: DbResource[] | null;
};

export async function generateMetadata({ params }: PageProps) {
  const { moduleSlug } = await params;
  return {
    title: `${moduleSlug} — DAP`,
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

  const supabase = await createClient();

  // 1) Auth (esta ruta no está en proxy.ts PROTECTED_PREFIXES → check manual)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?redirectTo=/fases/${phaseSlug}/modulos/${moduleSlug}?section=${currentSection}`,
    );
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
      `id, slug, title, subtitle, description, objective, main_revelation,
       impartation_phrase, duration_minutes, course_week,
       phase:phases(id, slug, order_index, title, published),
       sections:module_sections(
         id, kind, order_index, title, body_md, mux_playback_id,
         duration_seconds,
         progress:section_progress(completed, last_position_seconds)
       ),
       resources:module_resources(id, title, kind, url, order_index)`,
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
    redirect(`/fases/${phaseSlug}?toast=module-locked`);
  }

  // 6) Sidebar: módulos hermanos + progreso
  const { data: siblings } = await supabase
    .from("modules")
    .select(
      "id, slug, order_index, title, module_progress(completed)",
    )
    .eq("phase_id", mod.phase.id)
    .order("order_index", { ascending: true });

  const sidebarModules: SidebarModule[] = (siblings ?? []).map(
    (s: {
      id: string;
      slug: string;
      order_index: number;
      title: string;
      module_progress: { completed: boolean | null }[] | null;
    }) => ({
      id: s.id,
      slug: s.slug,
      order_index: s.order_index,
      title: s.title,
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
      title: SECTION_TITLE[kind],
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

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[300px_1fr]">
      <ModuleSidebar
        phaseTitle={mod.phase.title}
        phaseOrderIndex={mod.phase.order_index}
        phaseSlug={mod.phase.slug}
        modules={sidebarModules}
        currentModuleSlug={mod.slug}
      />

      <div className="flex min-h-screen flex-col">
        {/* Top bar mini */}
        <header className="flex items-center justify-between border-b px-6 py-4">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Link href="/dashboard" className="hover:text-foreground">
              Diplomado
            </Link>
            <span className="text-border">/</span>
            <Link
              href={`/fases/${mod.phase.slug}`}
              className="hover:text-foreground"
            >
              Fase {String(mod.phase.order_index).padStart(2, "0")}
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground">{mod.title}</span>
          </nav>
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <SignOutButton variant="ghost" />
          </div>
        </header>

        <main className="flex-1 px-6 py-10">
          <div className="mx-auto max-w-3xl">
            <Link
              href={`/fases/${mod.phase.slug}`}
              className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-brand-coral"
            >
              <ArrowLeft className="size-3.5" />
              Volver a la fase
            </Link>

            <header className="mb-8">
              {mod.subtitle && (
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
                  {mod.subtitle}
                </p>
              )}
              <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                {mod.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                ≈ {mod.duration_minutes ?? 50} minutos · 5 partes
              </p>
            </header>

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
                className="mb-6 font-serif text-2xl font-semibold"
              >
                {SECTION_TITLE[currentSection]}
              </h2>

              {currentSection === "teaching" ? (
                <SectionTeaching
                  sectionId={activeSection.id}
                  moduleId={mod.id}
                  phaseSlug={mod.phase.slug}
                  moduleSlug={mod.slug}
                  muxPlaybackId={activeSection.mux_playback_id}
                  bodyMd={activeSection.body_md}
                  durationSeconds={activeSection.duration_seconds}
                  startPositionSeconds={startPosition}
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
                  bodyMd={activeSection.body_md}
                  module={{
                    objective: mod.objective,
                    main_revelation: mod.main_revelation,
                    impartation_phrase: mod.impartation_phrase,
                  }}
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
          </div>
        </main>
      </div>
    </div>
  );
}
