import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MS_PER_HOUR } from "@/lib/constants/time";

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

const REVEAL_DELAY_HOURS = 48;

/**
 * Submit del quiz por el alumno (v3.3 — gate 48h):
 *
 * - Calcula score y `passed` en el server (NUNCA confiar en cliente).
 * - INSERT en quiz_attempts con `reveal_at = now() + 48h`.
 * - NO ejecuta cascade aún (eso lo hace /api/quizzes/[id]/reveal cuando
 *   se cumplen las 48h y el alumno carga la sección de evaluación).
 * - Devuelve SOLO `{ attempt_id, reveal_at, attempt_count }` — sin
 *   score, sin graded. El alumno no debe poder espiar el resultado por
 *   network inspector.
 */
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

  // Cargar quiz mínimo (sin embed pesado) — solo lo necesario para validar
  // tipo de sección y umbral.
  const { data: quizRow, error: quizErr } = await supabase
    .from("quizzes")
    .select(
      `id, module_section_id, pass_threshold, max_attempts,
       section:module_sections!inner(kind, module_id)`,
    )
    .eq("id", quizId)
    .maybeSingle<{
      id: string;
      module_section_id: string;
      pass_threshold: number;
      max_attempts: number | null;
      section: { kind: string; module_id: string };
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

  // Gate v3.3: has_access_to_module (suscripción + course_week + admin override).
  const moduleId = quizRow.section.module_id;
  const { data: hasAccess } = await supabase.rpc("has_access_to_module", {
    p_module_id: moduleId,
  });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";
  if (!hasAccess && !isAdmin) {
    return NextResponse.json(
      { error: "No tienes acceso a este módulo todavía" },
      { status: 403 },
    );
  }

  // No aceptamos otro intento si ya hay uno aprobado (revealed o no).
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

  // Si hay un attempt pendiente de reveal (reveal_at > now()) — el alumno
  // tiene que esperar antes de reintentar. Esto evita farm de respuestas.
  const { data: pendingReveal } = await supabase
    .from("quiz_attempts")
    .select("id, reveal_at")
    .eq("user_id", user.id)
    .eq("quiz_id", quizId)
    .is("revealed_at", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; reveal_at: string }>();
  if (pendingReveal && new Date(pendingReveal.reveal_at) > new Date()) {
    return NextResponse.json(
      {
        error: "Tu último intento aún está en revisión. Vuelve después.",
        pending_reveal_at: pendingReveal.reveal_at,
      },
      { status: 409 },
    );
  }

  // max_attempts
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

  // Calcular score (NO se devuelve)
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

  let correctCount = 0;
  for (const q of questions) {
    if (isCorrect(q, parsed.data.answers[q.id])) correctCount++;
  }
  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= quizRow.pass_threshold;

  // Insert con reveal_at = +48h. Para admin emparejamos reveal_at con
  // submitted_at (sin gate) para no romper QA.
  const now = new Date();
  const revealAt = isAdmin
    ? now
    : new Date(now.getTime() + REVEAL_DELAY_HOURS * MS_PER_HOUR);

  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id,
      quiz_id: quizId,
      score_percent: scorePercent,
      passed,
      answers: parsed.data.answers,
      submitted_at: now.toISOString(),
      reveal_at: revealAt.toISOString(),
    })
    .select("id, reveal_at")
    .single();
  if (attemptErr) {
    return NextResponse.json({ error: attemptErr.message }, { status: 500 });
  }

  // attempt_count para que la UI pueda saber cuántos lleva
  const { count: attemptCount } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("quiz_id", quizId);

  return NextResponse.json({
    attempt_id: attempt.id,
    reveal_at: attempt.reveal_at,
    attempt_count: attemptCount ?? 1,
  });
}
