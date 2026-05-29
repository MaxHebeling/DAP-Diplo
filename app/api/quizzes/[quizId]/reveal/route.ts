import { NextResponse, type NextRequest } from "next/server";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { runQuizPassedCascade } from "@/lib/quizzes/cascade";

export const runtime = "nodejs";

type AnswerEntry =
  | { selected_index: number }
  | { selected: boolean };

type QuestionRow = {
  id: string;
  prompt: string;
  prompt_en: string | null;
  kind: "multiple_choice" | "true_false";
  payload: Record<string, unknown>;
  payload_en: Record<string, unknown> | null;
  explanation: string | null;
  explanation_en: string | null;
  order_index: number;
};

type GradedQuestion = {
  question_id: string;
  prompt: string;
  kind: "multiple_choice" | "true_false";
  is_correct: boolean;
  student_answer: AnswerEntry | null;
  correct_answer: AnswerEntry;
  options?: string[];
  explanation: string | null;
};

type RevealRpcRow = {
  attempt_id: string;
  user_id: string;
  quiz_id: string;
  score_percent: number;
  passed: boolean;
  answers: Record<string, AnswerEntry>;
  reveal_at: string | null;
  revealed_at: string;
};

function isCorrect(q: QuestionRow, answer: AnswerEntry | undefined): boolean {
  if (!answer) return false;
  if (q.kind === "multiple_choice") {
    const correct = q.payload?.correct_index;
    return (
      typeof correct === "number" &&
      "selected_index" in answer &&
      answer.selected_index === correct
    );
  }
  const correct = q.payload?.correct;
  return (
    typeof correct === "boolean" &&
    "selected" in answer &&
    answer.selected === correct
  );
}

function correctAnswerOf(q: QuestionRow): AnswerEntry {
  if (q.kind === "multiple_choice") {
    return { selected_index: Number(q.payload?.correct_index ?? 0) };
  }
  return { selected: Boolean(q.payload?.correct) };
}

/**
 * Revela el último intento del alumno para este quiz si reveal_at <= now().
 *
 * Flujo:
 * 1. Busca el último attempt del user en este quiz.
 * 2. Si ya está revealed: devuelve graded sin cambios.
 * 3. Si reveal_at todavía está en el futuro: 409 (todavía no, vuelve después).
 * 4. RPC reveal_quiz_attempt → marca revealed_at, valida ownership +
 *    timing en server. Idempotente.
 * 5. Si passed → corre cascade (section_progress + module + cert + email).
 * 6. Devuelve graded breakdown.
 *
 * El endpoint es POST porque es mutating. Lo invoca el QuizPlayer
 * automáticamente en mount si detecta un attempt pendiente con
 * reveal_at <= now().
 */
export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ quizId: string }> },
) {
  const { quizId } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 1. Encontrar el último attempt del user
  const { data: latest, error: latestErr } = await supabase
    .from("quiz_attempts")
    .select("id, reveal_at, revealed_at")
    .eq("user_id", user.id)
    .eq("quiz_id", quizId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      reveal_at: string | null;
      revealed_at: string | null;
    }>();

  if (latestErr) {
    return NextResponse.json({ error: latestErr.message }, { status: 500 });
  }
  if (!latest) {
    return NextResponse.json(
      { error: "No hay intentos para revelar." },
      { status: 404 },
    );
  }

  if (latest.reveal_at && new Date(latest.reveal_at) > new Date()) {
    return NextResponse.json(
      {
        error: "Todavía no se puede revelar.",
        reveal_at: latest.reveal_at,
      },
      { status: 409 },
    );
  }

  // 2. Llamar al RPC (idempotente)
  const { data: revealData, error: revealErr } = await supabase
    .rpc("reveal_quiz_attempt", { p_attempt_id: latest.id })
    .single<RevealRpcRow>();
  if (revealErr || !revealData) {
    return NextResponse.json(
      { error: revealErr?.message ?? "No se pudo revelar." },
      { status: 500 },
    );
  }

  // 3. Cargar preguntas para armar el graded breakdown
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select(
      "id, prompt, prompt_en, kind, payload, payload_en, explanation, explanation_en, order_index",
    )
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  const locale = await getLocale();
  const useEn = locale === "en";

  const graded: GradedQuestion[] = (questions ?? []).map((q) => {
    const studentAns = revealData.answers[q.id];
    // Para localización el `correct_index` debe coincidir entre payload y
    // payload_en (no movimos posiciones). El scoring base usa `payload`,
    // pero las options/explanation visibles deben ir en el idioma activo.
    const prompt = useEn && q.prompt_en ? q.prompt_en : q.prompt;
    const payload = useEn && q.payload_en ? q.payload_en : q.payload;
    const explanation =
      useEn && q.explanation_en ? q.explanation_en : q.explanation;
    return {
      question_id: q.id,
      prompt,
      kind: q.kind,
      is_correct: isCorrect(q, studentAns),
      student_answer: studentAns ?? null,
      correct_answer: correctAnswerOf(q),
      options:
        q.kind === "multiple_choice"
          ? ((payload?.options as string[] | undefined) ?? [])
          : undefined,
      explanation,
    };
  });

  // 4. Si pasó Y es la primera vez que se revela → cascada.
  //    (Si latest.revealed_at NO era null antes del RPC, ya corrimos
  //    cascade en una invocación anterior — no la repetimos para no
  //    spamear con cert PDFs.)
  let blockCompletion: Record<string, unknown> | null = null;
  let moduleCompleted = false;
  const wasFirstReveal = latest.revealed_at === null;

  if (wasFirstReveal && revealData.passed) {
    // Necesitamos los datos del módulo / fase para la cascade
    const { data: quizMeta } = await supabase
      .from("quizzes")
      .select(
        `module_section_id,
         section:module_sections!inner(
           module_id,
           module:modules!inner(slug, phase_id, phase:phases!inner(slug))
         )`,
      )
      .eq("id", quizId)
      .maybeSingle<{
        module_section_id: string;
        section: {
          module_id: string;
          module: {
            slug: string;
            phase_id: string;
            phase: { slug: string };
          };
        };
      }>();

    if (quizMeta) {
      const cascade = await runQuizPassedCascade({
        supabase,
        userId: user.id,
        moduleSectionId: quizMeta.module_section_id,
        moduleId: quizMeta.section.module_id,
        phaseId: quizMeta.section.module.phase_id,
        phaseSlug: quizMeta.section.module.phase.slug,
        moduleSlug: quizMeta.section.module.slug,
      });
      blockCompletion = cascade.blockCompletion;
      moduleCompleted = cascade.moduleCompleted;
    }
  }

  return NextResponse.json({
    attempt_id: revealData.attempt_id,
    score_percent: revealData.score_percent,
    passed: revealData.passed,
    reveal_at: revealData.reveal_at,
    revealed_at: revealData.revealed_at,
    was_first_reveal: wasFirstReveal,
    module_completed: moduleCompleted,
    block_completion: blockCompletion,
    graded,
  });
}
