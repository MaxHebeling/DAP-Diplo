import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  SectionEditForm,
  type SectionFormSection,
} from "@/components/admin/section-edit-form";
import {
  QuizEditor,
  type QuizRow,
} from "@/components/admin/quiz-editor";
import type { QuestionRow } from "@/components/admin/quiz-question-form";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string; moduleSlug: string; sid: string }>;
};

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("sectionEdit.metaTitle") };
}

export default async function AdminSectionEditPage({ params }: PageProps) {
  const { slug: id, moduleSlug: mid, sid } = await params;
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: phase } = await supabase
    .from("phases")
    .select("id, order_index, title")
    .eq("id", id)
    .maybeSingle();
  if (!phase) notFound();

  const { data: mod } = await supabase
    .from("modules")
    .select("id, phase_id, order_index, title")
    .eq("id", mid)
    .maybeSingle();
  if (!mod || mod.phase_id !== id) notFound();

  const { data: section } = await supabase
    .from("module_sections")
    .select(
      "id, module_id, kind, order_index, title, body_md, title_en, body_md_en, mux_playback_id, duration_seconds",
    )
    .eq("id", sid)
    .maybeSingle();
  if (!section || section.module_id !== mid) notFound();

  const formSection: SectionFormSection = {
    id: section.id,
    module_id: section.module_id,
    phase_id: id,
    kind: section.kind,
    title: section.title,
    body_md: section.body_md,
    title_en: section.title_en,
    body_md_en: section.body_md_en,
    mux_playback_id: section.mux_playback_id,
    duration_seconds: section.duration_seconds,
  };

  // Para secciones de evaluación: asegurar que existe un quiz 1:1 y cargar sus preguntas.
  let quiz: QuizRow | null = null;
  let questions: QuestionRow[] = [];
  if (section.kind === "evaluation") {
    const { data: existing } = await supabase
      .from("quizzes")
      .select(
        "id, module_section_id, title, description, pass_threshold, max_attempts, shuffle_questions",
      )
      .eq("module_section_id", section.id)
      .maybeSingle();

    if (existing) {
      quiz = existing as QuizRow;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("quizzes")
        .insert({
          module_section_id: section.id,
          title: `Evaluación: ${mod.title}`,
          pass_threshold: 70,
          shuffle_questions: true,
        })
        .select(
          "id, module_section_id, title, description, pass_threshold, max_attempts, shuffle_questions",
        )
        .single();
      if (createErr) {
        throw new Error(
          t("sectionEdit.createQuizError", { message: createErr.message }),
        );
      }
      quiz = created as QuizRow;
    }

    const { data: qs, error: qsErr } = await supabase
      .from("quiz_questions")
      .select("id, quiz_id, prompt, kind, payload, explanation, order_index")
      .eq("quiz_id", quiz.id)
      .order("order_index", { ascending: true })
      .returns<QuestionRow[]>();
    if (qsErr) {
      throw new Error(
        t("sectionEdit.loadQuestionsError", { message: qsErr.message }),
      );
    }
    questions = qs ?? [];
  }

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/admin/fases/${id}/modulos/${mid}/secciones`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          {t("sectionEdit.backToSections")}
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("sectionEdit.eyebrow", {
              phaseIndex: String(phase.order_index).padStart(2, "0"),
              moduleIndex: String(mod.order_index).padStart(2, "0"),
              moduleTitle: mod.title,
            })}
          </p>
          <h1 className="font-grotesk text-3xl font-semibold">
            {t("sectionEdit.title", {
              index: String(section.order_index).padStart(2, "0"),
            })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("sectionEdit.description")}
          </p>
        </header>

        <SectionEditForm section={formSection} />

        {section.kind === "evaluation" && quiz && (
          <div className="mt-10">
            <QuizEditor
              quiz={quiz}
              questions={questions}
              ctx={{ phaseId: id, moduleId: mid, sectionId: sid }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
