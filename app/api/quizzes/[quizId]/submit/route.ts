import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const submitSchema = z.object({
  // Map question_id → answer payload (kind-dependent)
  // multiple_choice: { selected_index: number }
  // true_false: { selected: boolean }
  answers: z.record(
    z.string().uuid(),
    z.union([
      z.object({ selected_index: z.number().int().min(0).max(5) }),
      z.object({ selected: z.boolean() }),
    ]),
  ),
});

type AnswerEntry =
  | { selected_index: number }
  | { selected: boolean };

type QuestionRow = {
  id: string;
  prompt: string;
  kind: "multiple_choice" | "true_false";
  payload: Record<string, unknown>;
  explanation: string | null;
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
  // true_false
  const correct = q.payload?.correct;
  return (
    typeof correct === "boolean" &&
    "selected" in answer &&
    answer.selected === correct
  );
}

function correctAnswerOf(q: QuestionRow): AnswerEntry {
  if (q.kind === "multiple_choice") {
    return {
      selected_index: Number(q.payload?.correct_index ?? 0),
    };
  }
  return { selected: Boolean(q.payload?.correct) };
}

export async function POST(
  request: NextRequest,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Respuestas inválidas" },
      { status: 400 },
    );
  }

  // Cargar quiz + sección + módulo + bloque para validar acceso
  const { data: quizRow, error: quizErr } = await supabase
    .from("quizzes")
    .select(
      `id, module_section_id, pass_threshold, max_attempts,
       section:module_sections!inner(
         id, kind, module_id,
         module:modules!inner(id, slug, block_id, block:blocks!inner(id, slug))
       )`,
    )
    .eq("id", quizId)
    .maybeSingle<{
      id: string;
      module_section_id: string;
      pass_threshold: number;
      max_attempts: number | null;
      section: {
        id: string;
        kind: string;
        module_id: string;
        module: {
          id: string;
          slug: string;
          block_id: string;
          block: { id: string; slug: string };
        };
      };
    }>();
  if (quizErr || !quizRow) {
    return NextResponse.json(
      { error: "Quiz no encontrado o sin acceso" },
      { status: 404 },
    );
  }
  if (quizRow.section.kind !== "evaluation") {
    return NextResponse.json(
      { error: "Este quiz no es de evaluación" },
      { status: 400 },
    );
  }

  // Gating: usuario debe tener acceso al bloque (drip/subscription) o ser admin
  const blockId = quizRow.section.module.block_id;
  const moduleSlug = quizRow.section.module.slug;
  const blockSlug = quizRow.section.module.block.slug;

  const [{ data: hasAccess }, { data: profile }] = await Promise.all([
    supabase.rpc("has_block_access", { p_block_id: blockId }),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const isAdmin = profile?.role === "admin";
  if (!hasAccess && !isAdmin) {
    return NextResponse.json(
      { error: "No tienes acceso a este bloque" },
      { status: 403 },
    );
  }

  // Chequear si ya hay un intento aprobado (en ese caso no aceptamos otro envío)
  const { data: existingPassed } = await supabase
    .from("quiz_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("quiz_id", quizId)
    .eq("passed", true)
    .limit(1)
    .maybeSingle();
  if (existingPassed) {
    return NextResponse.json(
      { error: "Ya aprobaste este quiz." },
      { status: 409 },
    );
  }

  // Chequear max_attempts
  if (quizRow.max_attempts !== null) {
    const { count: previous } = await supabase
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("quiz_id", quizId);
    if ((previous ?? 0) >= quizRow.max_attempts) {
      return NextResponse.json(
        { error: "Has agotado tus intentos." },
        { status: 403 },
      );
    }
  }

  // Cargar preguntas y calcular score
  const { data: questions, error: qErr } = await supabase
    .from("quiz_questions")
    .select("id, prompt, kind, payload, explanation, order_index")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();
  if (qErr || !questions || questions.length === 0) {
    return NextResponse.json(
      { error: "Quiz sin preguntas." },
      { status: 400 },
    );
  }

  const graded: GradedQuestion[] = questions.map((q) => {
    const studentAns = parsed.data.answers[q.id];
    const correct = isCorrect(q, studentAns);
    return {
      question_id: q.id,
      prompt: q.prompt,
      kind: q.kind,
      is_correct: correct,
      student_answer: studentAns ?? null,
      correct_answer: correctAnswerOf(q),
      options:
        q.kind === "multiple_choice"
          ? ((q.payload?.options as string[] | undefined) ?? [])
          : undefined,
      explanation: q.explanation,
    };
  });

  const correctCount = graded.filter((g) => g.is_correct).length;
  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= quizRow.pass_threshold;

  // Insertar intento
  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      score_percent: scorePercent,
      passed,
      answers: parsed.data.answers,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (attemptErr) {
    return NextResponse.json({ error: attemptErr.message }, { status: 500 });
  }

  // Si pasó: marcar sección completada + cascadear módulo + bloque
  let moduleCompleted = false;
  let blockCompletion: Record<string, unknown> | null = null;
  if (passed) {
    const { error: spErr } = await supabase.from("section_progress").upsert(
      {
        user_id: user.id,
        module_section_id: quizRow.module_section_id,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_section_id" },
    );
    if (spErr) {
      console.error("[quiz.submit] section_progress upsert failed:", spErr.message);
    }

    // ¿Las 5 secciones del módulo están completed?
    const { data: sectionRows } = await supabase
      .from("module_sections")
      .select("id, section_progress(completed)")
      .eq("module_id", quizRow.section.module_id);

    const allDone =
      (sectionRows?.length ?? 0) === 5 &&
      (sectionRows ?? []).every(
        (s) =>
          Array.isArray(s.section_progress) &&
          s.section_progress.some(
            (p: { completed: boolean | null }) => p.completed === true,
          ),
      );
    if (allDone) {
      await supabase.from("module_progress").upsert(
        {
          user_id: user.id,
          module_id: quizRow.section.module_id,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id" },
      );
      moduleCompleted = true;

      // Cascada: ¿bloque completo? otorga rank + certificate.
      const { data: blockResult, error: cbErr } = await supabase.rpc(
        "complete_block_if_done",
        { p_user_id: user.id, p_block_id: blockId },
      );
      if (cbErr) {
        console.error(
          "[quiz.submit] complete_block_if_done failed:",
          cbErr.message,
        );
      } else if (
        blockResult &&
        typeof blockResult === "object" &&
        !Array.isArray(blockResult)
      ) {
        blockCompletion = blockResult as Record<string, unknown>;
        // Si se emitió certificado, invalida el dashboard para reflejar el nuevo rango/cert.
        if (blockCompletion.newly_completed === true) {
          revalidatePath(`/dashboard`);
          revalidatePath(`/bloques/${blockSlug}`);
        }
      }
    }

    revalidatePath(`/bloques/${blockSlug}/modulos/${moduleSlug}`);
  }

  // Conteo de intentos tras inserción (para UI "Volver a intentar")
  const { count: attemptCount } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("quiz_id", quizId);

  return NextResponse.json({
    attempt_id: attempt.id,
    score_percent: scorePercent,
    passed,
    pass_threshold: quizRow.pass_threshold,
    max_attempts: quizRow.max_attempts,
    attempt_count: attemptCount ?? 1,
    module_completed: moduleCompleted,
    block_completion: blockCompletion,
    graded,
  });
}
