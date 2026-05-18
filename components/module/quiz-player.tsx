"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type PlayerQuestion = {
  id: string;
  prompt: string;
  kind: "multiple_choice" | "true_false";
  // Para el alumno: el payload pelado, SIN correct_index ni correct.
  // Para multiple_choice: { options: string[] }
  // Para true_false: nada visible (radio V/F estático)
  options?: string[];
};

export type PlayerQuiz = {
  id: string;
  title: string;
  description: string | null;
  pass_threshold: number;
  max_attempts: number | null;
  shuffle_questions: boolean;
};

type StudentAnswer =
  | { selected_index: number }
  | { selected: boolean };

type GradedQuestion = {
  question_id: string;
  prompt: string;
  kind: "multiple_choice" | "true_false";
  is_correct: boolean;
  student_answer: StudentAnswer | null;
  correct_answer: StudentAnswer;
  options?: string[];
  explanation: string | null;
};

type SubmitResult = {
  attempt_id: string;
  score_percent: number;
  passed: boolean;
  pass_threshold: number;
  max_attempts: number | null;
  attempt_count: number;
  module_completed: boolean;
  graded: GradedQuestion[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizPlayer({
  quiz,
  questions,
  attemptCount,
  blockSlug,
  moduleSlug,
}: {
  quiz: PlayerQuiz;
  questions: PlayerQuestion[];
  attemptCount: number;
  blockSlug: string;
  moduleSlug: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [version, setVersion] = useState(0); // bump → reshuffle on retry

  // Shuffle estable por intento: se recalcula cuando cambia "version"
  const ordered = useMemo(() => {
    return quiz.shuffle_questions ? shuffle(questions) : questions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, quiz.shuffle_questions, questions.length]);

  function setMC(qid: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [qid]: { selected_index: idx } }));
  }
  function setTF(qid: string, val: boolean) {
    setAnswers((prev) => ({ ...prev, [qid]: { selected: val } }));
  }

  const allAnswered = ordered.every((q) => answers[q.id] !== undefined);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) {
      toast.error("Responde todas las preguntas antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(data as SubmitResult);
      if ((data as SubmitResult).passed) {
        toast.success("¡Quiz aprobado!");
        router.refresh();
      } else {
        toast.warning(
          `${(data as SubmitResult).score_percent}% — necesitas ${quiz.pass_threshold}% para aprobar.`,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers({});
    setVersion((v) => v + 1);
  }

  // ============== RESULTADOS ==============
  if (result) {
    return (
      <ResultView
        quiz={quiz}
        result={result}
        questionsOrdered={ordered}
        attemptCountTotal={result.attempt_count}
        onRetry={retry}
        blockSlug={blockSlug}
        moduleSlug={moduleSlug}
      />
    );
  }

  // ============== FORM ==============
  const attemptsRemaining =
    quiz.max_attempts !== null
      ? Math.max(0, quiz.max_attempts - attemptCount)
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-2xl border border-brand-coral/30 bg-brand-coral/5 p-6">
        <h3 className="font-serif text-xl font-semibold">{quiz.title}</h3>
        {quiz.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {quiz.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>
            Umbral aprobatorio: <strong>{quiz.pass_threshold}%</strong>
          </span>
          {attemptsRemaining !== null && (
            <span>
              Intentos restantes: <strong>{attemptsRemaining}</strong>
            </span>
          )}
          <span>
            {ordered.length}{" "}
            {ordered.length === 1 ? "pregunta" : "preguntas"}
          </span>
        </div>
      </div>

      <ol className="space-y-5">
        {ordered.map((q, i) => (
          <li
            key={q.id}
            className="rounded-xl border bg-card p-5"
            aria-labelledby={`q-${q.id}-prompt`}
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-coral text-xs font-medium text-brand-coral-foreground tabular-nums">
                {i + 1}
              </span>
              <p
                id={`q-${q.id}-prompt`}
                className="font-medium leading-snug"
              >
                {q.prompt}
              </p>
            </div>

            {q.kind === "multiple_choice" && (
              <ul className="space-y-2 pl-9">
                {(q.options ?? []).map((opt, idx) => {
                  const selected =
                    answers[q.id] &&
                    "selected_index" in answers[q.id] &&
                    (answers[q.id] as { selected_index: number })
                      .selected_index === idx;
                  return (
                    <li key={idx}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-muted/40 has-[:checked]:border-brand-coral has-[:checked]:bg-brand-coral/5">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={Boolean(selected)}
                          onChange={() => setMC(q.id, idx)}
                          className="size-4 accent-brand-coral"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {q.kind === "true_false" && (
              <div className="flex gap-3 pl-9">
                {[
                  { label: "Verdadero", val: true },
                  { label: "Falso", val: false },
                ].map((opt) => {
                  const selected =
                    answers[q.id] &&
                    "selected" in answers[q.id] &&
                    (answers[q.id] as { selected: boolean }).selected ===
                      opt.val;
                  return (
                    <label
                      key={opt.label}
                      className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 py-3 hover:bg-muted/40 has-[:checked]:border-brand-coral has-[:checked]:bg-brand-coral/5"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={Boolean(selected)}
                        onChange={() => setTF(q.id, opt.val)}
                        className="size-4 accent-brand-coral"
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-end gap-3 pt-2">
        <p className="mr-auto text-xs text-muted-foreground">
          {Object.keys(answers).length} / {ordered.length} respondidas
        </p>
        <Button type="submit" disabled={submitting || !allAnswered}>
          {submitting ? "Enviando…" : "Enviar respuestas"}
        </Button>
      </div>
    </form>
  );
}

// ============== RESULT VIEW ==============

function ResultView({
  quiz,
  result,
  questionsOrdered,
  attemptCountTotal,
  onRetry,
  blockSlug,
  moduleSlug,
}: {
  quiz: PlayerQuiz;
  result: SubmitResult;
  questionsOrdered: PlayerQuestion[];
  attemptCountTotal: number;
  onRetry: () => void;
  blockSlug: string;
  moduleSlug: string;
}) {
  // Indexamos resultado por question_id para mostrar en el orden mostrado al alumno
  const byId = new Map(result.graded.map((g) => [g.question_id, g]));

  const attemptsRemaining =
    quiz.max_attempts !== null
      ? Math.max(0, quiz.max_attempts - attemptCountTotal)
      : null;
  const canRetry =
    !result.passed &&
    (quiz.max_attempts === null || attemptsRemaining! > 0);
  const outOfAttempts =
    !result.passed &&
    quiz.max_attempts !== null &&
    attemptsRemaining === 0;

  return (
    <div className="space-y-6">
      {/* Score banner */}
      <div
        className={[
          "rounded-2xl border p-6",
          result.passed
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-red-500/30 bg-red-500/5",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          {result.passed ? (
            <CheckCircle2 className="size-7 text-emerald-500" />
          ) : (
            <XCircle className="size-7 text-red-500" />
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Resultado
            </p>
            <p className="font-serif text-3xl font-semibold leading-none">
              {result.score_percent}%
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">
              Umbral aprobatorio
            </p>
            <p className="text-lg font-medium tabular-nums">
              {result.pass_threshold}%
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm">
          {result.passed
            ? "¡Felicidades! Aprobaste esta evaluación."
            : "Aún no alcanzas el umbral. Revisa las explicaciones y vuelve a intentarlo."}
        </p>
      </div>

      {/* Per-question feedback */}
      <ol className="space-y-4">
        {questionsOrdered.map((q, i) => {
          const g = byId.get(q.id);
          if (!g) return null;
          return (
            <li
              key={q.id}
              className={[
                "rounded-xl border p-5",
                g.is_correct
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5",
              ].join(" ")}
            >
              <div className="mb-3 flex items-start gap-3">
                <span
                  className={[
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                    g.is_correct
                      ? "bg-emerald-500 text-white"
                      : "bg-red-500 text-white",
                  ].join(" ")}
                >
                  {i + 1}
                </span>
                <p className="font-medium leading-snug">{q.prompt}</p>
              </div>

              <div className="space-y-1 pl-9 text-sm">
                <AnswerSummary
                  kind={q.kind}
                  label="Tu respuesta"
                  answer={g.student_answer}
                  options={q.options ?? g.options}
                />
                {!g.is_correct && (
                  <AnswerSummary
                    kind={q.kind}
                    label="Correcta"
                    answer={g.correct_answer}
                    options={q.options ?? g.options}
                    highlight
                  />
                )}
                {g.explanation && (
                  <p className="mt-2 rounded-lg bg-card/60 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Explicación:
                    </span>{" "}
                    {g.explanation}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* CTA */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {result.passed && (
          <Button
            render={
              <Link
                href={`/bloques/${blockSlug}/modulos/${moduleSlug}?section=impartation`}
              />
            }
          >
            Continuar a Impartición
            <ArrowRight className="size-4" />
          </Button>
        )}
        {canRetry && (
          <Button variant="outline" onClick={onRetry} type="button">
            <RefreshCw className="size-4" />
            Volver a intentar
          </Button>
        )}
        {outOfAttempts && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            Has agotado tus intentos. Contacta al equipo si crees que es un
            error.
          </div>
        )}
      </div>
    </div>
  );
}

function AnswerSummary({
  kind,
  label,
  answer,
  options,
  highlight = false,
}: {
  kind: "multiple_choice" | "true_false";
  label: string;
  answer: StudentAnswer | null;
  options?: string[];
  highlight?: boolean;
}) {
  let text = "—";
  if (answer) {
    if (kind === "multiple_choice" && "selected_index" in answer) {
      text = options?.[answer.selected_index] ?? `Opción ${answer.selected_index + 1}`;
    } else if (kind === "true_false" && "selected" in answer) {
      text = answer.selected ? "Verdadero" : "Falso";
    }
  }
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className={highlight ? "font-medium text-emerald-700 dark:text-emerald-400" : ""}>
        {text}
      </span>
    </p>
  );
}

// ============== ALREADY-PASSED VIEW ==============
// (Mostrada cuando el alumno ya aprobó previamente.)

export function QuizAlreadyPassed({
  quiz,
  bestScore,
  blockSlug,
  moduleSlug,
}: {
  quiz: PlayerQuiz;
  bestScore: number;
  blockSlug: string;
  moduleSlug: string;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-7 text-emerald-500" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Evaluación aprobada
            </p>
            <p className="font-serif text-2xl font-semibold leading-tight">
              {quiz.title}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Mejor puntaje</p>
            <p className="text-2xl font-medium tabular-nums">{bestScore}%</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          render={
            <Link
              href={`/bloques/${blockSlug}/modulos/${moduleSlug}?section=impartation`}
            />
          }
        >
          Continuar a Impartición
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
