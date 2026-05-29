"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type PlayerQuestion = {
  id: string;
  prompt: string;
  kind: "multiple_choice" | "true_false";
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

export type LatestAttemptSummary = {
  id: string;
  reveal_at: string | null;
  revealed_at: string | null;
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

type RevealResponse = {
  attempt_id: string;
  score_percent: number;
  passed: boolean;
  reveal_at: string | null;
  revealed_at: string | null;
  was_first_reveal: boolean;
  module_completed: boolean;
  block_completion: Record<string, unknown> | null;
  graded: GradedQuestion[];
};

type SubmitResponse = {
  attempt_id: string;
  reveal_at: string;
  attempt_count: number;
};

type Mode = "form" | "pending" | "revealed";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatRevealDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function QuizPlayer({
  quiz,
  questions,
  attemptCount,
  phaseSlug,
  moduleSlug,
  latestAttempt,
}: {
  quiz: PlayerQuiz;
  questions: PlayerQuestion[];
  attemptCount: number;
  phaseSlug: string;
  moduleSlug: string;
  latestAttempt: LatestAttemptSummary | null;
}) {
  const t = useTranslations("Module");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [version, setVersion] = useState(0);

  // Estado inicial según latestAttempt
  const [pendingReveal, setPendingReveal] = useState<string | null>(() => {
    if (!latestAttempt || !latestAttempt.reveal_at) return null;
    if (latestAttempt.revealed_at) return null;
    if (new Date(latestAttempt.reveal_at) > new Date()) {
      return latestAttempt.reveal_at;
    }
    return null;
  });

  const initialMode: Mode = (() => {
    if (!latestAttempt) return "form";
    if (
      latestAttempt.reveal_at &&
      new Date(latestAttempt.reveal_at) > new Date() &&
      !latestAttempt.revealed_at
    ) {
      return "pending";
    }
    // Si reveal_at ya pasó (con o sin revealed_at), vamos a "revealed"
    // y el useEffect fetcha /reveal para hidratar el ResultView.
    return "revealed";
  })();
  const [mode, setMode] = useState<Mode>(initialMode);

  // Shuffle estable por intento
  const ordered = useMemo(
    () => (quiz.shuffle_questions ? shuffle(questions) : questions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, quiz.shuffle_questions, questions.length],
  );

  // Auto-revelar al montar si correspondía
  useEffect(() => {
    if (mode !== "revealed" || reveal !== null) return;
    void fetchReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReveal() {
    setRevealing(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        // 409 = todavía no se puede
        if (res.status === 409 && data?.reveal_at) {
          setPendingReveal(data.reveal_at as string);
          setMode("pending");
          return;
        }
        toast.error(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      const r = data as RevealResponse;
      setReveal(r);
      setMode("revealed");
      if (r.was_first_reveal && r.passed) {
        toast.success(t("quiz.passedToast"));
        router.refresh();
      }
    } finally {
      setRevealing(false);
    }
  }

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
      toast.error(t("quiz.answerAllToast"));
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
        toast.error(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      const r = data as SubmitResponse;
      setPendingReveal(r.reveal_at);
      setMode("pending");
      toast.success(t("quiz.receivedToast"));
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setReveal(null);
    setAnswers({});
    setPendingReveal(null);
    setMode("form");
    setVersion((v) => v + 1);
  }

  // ============== PENDING (48h) ==============
  if (mode === "pending" && pendingReveal) {
    return (
      <PendingRevealView
        quiz={quiz}
        revealAt={pendingReveal}
        onCheck={fetchReveal}
        checking={revealing}
      />
    );
  }

  // ============== REVEALED (con graded) ==============
  if (mode === "revealed") {
    if (revealing || !reveal) {
      return (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          {t("quiz.loadingResult")}
        </div>
      );
    }
    return (
      <ResultView
        quiz={quiz}
        reveal={reveal}
        questionsOrdered={ordered}
        attemptCountTotal={attemptCount}
        onRetry={retry}
        phaseSlug={phaseSlug}
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
      <div className="rounded-2xl border border-brand-coral/30 bg-brand-coral/10 p-6">
        <h3 className="font-grotesk text-xl font-bold text-white">{quiz.title}</h3>
        {quiz.description && (
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {quiz.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/70">
          <span>
            {t("quiz.passThreshold")}<strong className="text-white">{quiz.pass_threshold}%</strong>
          </span>
          {attemptsRemaining !== null && (
            <span>
              {t("quiz.attemptsRemaining")}<strong className="text-white">{attemptsRemaining}</strong>
            </span>
          )}
          <span>
            {ordered.length}{" "}
            {ordered.length === 1
              ? t("quiz.questionSingular")
              : t("quiz.questionPlural")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300">
            <Clock className="size-3" />
            {t("quiz.resultIn48h")}
          </span>
        </div>
      </div>

      <ol className="space-y-5">
        {ordered.map((q, i) => (
          <li
            key={q.id}
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5"
            aria-labelledby={`q-${q.id}-prompt`}
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-coral text-xs font-bold text-white tabular-nums">
                {i + 1}
              </span>
              <p
                id={`q-${q.id}-prompt`}
                className="font-grotesk text-base font-semibold leading-snug text-white"
              >
                {q.prompt}
              </p>
            </div>

            {q.kind === "multiple_choice" && (
              <ul className="space-y-2 pl-10">
                {(q.options ?? []).map((opt, idx) => {
                  const selected =
                    answers[q.id] &&
                    "selected_index" in answers[q.id] &&
                    (answers[q.id] as { selected_index: number })
                      .selected_index === idx;
                  return (
                    <li key={idx}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-white/90 transition-colors hover:border-white/20 hover:bg-white/[0.05] has-[:checked]:border-brand-coral has-[:checked]:bg-brand-coral/15 has-[:checked]:text-white">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={Boolean(selected)}
                          onChange={() => setMC(q.id, idx)}
                          className="size-4 accent-brand-coral"
                        />
                        <span className="text-sm font-medium">{opt}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {q.kind === "true_false" && (
              <div className="flex gap-3 pl-10">
                {[
                  { label: t("quiz.true"), val: true },
                  { label: t("quiz.false"), val: false },
                ].map((opt) => {
                  const selected =
                    answers[q.id] &&
                    "selected" in answers[q.id] &&
                    (answers[q.id] as { selected: boolean }).selected ===
                      opt.val;
                  return (
                    <label
                      key={opt.label}
                      className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-white/90 transition-colors hover:border-white/20 hover:bg-white/[0.05] has-[:checked]:border-brand-coral has-[:checked]:bg-brand-coral/15 has-[:checked]:text-white"
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
          {t("quiz.answeredCount", {
            answered: Object.keys(answers).length,
            total: ordered.length,
          })}
        </p>
        <Button type="submit" disabled={submitting || !allAnswered}>
          {submitting ? t("quiz.submitting") : t("quiz.submit")}
        </Button>
      </div>
    </form>
  );
}

// ============== PENDING REVEAL VIEW ==============

function PendingRevealView({
  quiz,
  revealAt,
  onCheck,
  checking,
}: {
  quiz: PlayerQuiz;
  revealAt: string;
  onCheck: () => void;
  checking: boolean;
}) {
  const t = useTranslations("Module");
  const quizNote = quiz.title.toLowerCase().includes("evaluación")
    ? ""
    : t("quiz.quizNote", { title: quiz.title });
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-8 text-center">
        <Clock className="mx-auto size-9 text-amber-400" strokeWidth={1.7} />
        <h3 className="mt-4 font-grotesk text-xl font-semibold">
          {t("quiz.pendingTitle")}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t.rich("quiz.pendingBody", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("quiz.availableOn")}</span>
          <span className="font-medium text-amber-200">
            {formatRevealDate(revealAt)}
          </span>
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onCheck} disabled={checking}>
          {checking ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("quiz.checking")}
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              {t("quiz.checkIfAvailable")}
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("quiz.whileWaiting", { quizNote })}
      </p>
    </div>
  );
}

// ============== RESULT VIEW ==============

function ResultView({
  quiz,
  reveal,
  questionsOrdered,
  attemptCountTotal,
  onRetry,
  phaseSlug,
  moduleSlug,
}: {
  quiz: PlayerQuiz;
  reveal: RevealResponse;
  questionsOrdered: PlayerQuestion[];
  attemptCountTotal: number;
  onRetry: () => void;
  phaseSlug: string;
  moduleSlug: string;
}) {
  const t = useTranslations("Module");
  const byId = new Map(reveal.graded.map((g) => [g.question_id, g]));

  const attemptsRemaining =
    quiz.max_attempts !== null
      ? Math.max(0, quiz.max_attempts - attemptCountTotal)
      : null;
  const canRetry =
    !reveal.passed &&
    (quiz.max_attempts === null || attemptsRemaining! > 0);
  const outOfAttempts =
    !reveal.passed &&
    quiz.max_attempts !== null &&
    attemptsRemaining === 0;

  return (
    <div className="space-y-6">
      <div
        className={[
          "rounded-2xl border p-6",
          reveal.passed
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-red-500/30 bg-red-500/5",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          {reveal.passed ? (
            <CheckCircle2 className="size-7 text-emerald-500" />
          ) : (
            <XCircle className="size-7 text-red-500" />
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("quiz.result")}
            </p>
            <p className="font-grotesk text-3xl font-semibold leading-none">
              {reveal.score_percent}%
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">
              {t("quiz.passThresholdLabel")}
            </p>
            <p className="text-lg font-medium tabular-nums">
              {quiz.pass_threshold}%
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm">
          {reveal.passed
            ? t("quiz.passedMessage")
            : t("quiz.failedMessage")}
        </p>
      </div>

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
                  label={t("quiz.yourAnswer")}
                  answer={g.student_answer}
                  options={q.options ?? g.options}
                />
                {!g.is_correct && (
                  <AnswerSummary
                    kind={q.kind}
                    label={t("quiz.correct")}
                    answer={g.correct_answer}
                    options={q.options ?? g.options}
                    highlight
                  />
                )}
                {g.explanation && (
                  <p className="mt-2 rounded-lg bg-card/60 p-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {t("quiz.explanation")}
                    </span>{" "}
                    {g.explanation}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        {reveal.passed && (
          <Button
            render={
              <Link
                href={`/fases/${phaseSlug}/modulos/${moduleSlug}?section=impartation`}
              />
            }
          >
            {t("quiz.continueToImpartation")}
            <ArrowRight className="size-4" />
          </Button>
        )}
        {canRetry && (
          <Button variant="outline" onClick={onRetry} type="button">
            <RefreshCw className="size-4" />
            {t("quiz.retry")}
          </Button>
        )}
        {outOfAttempts && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            {t("quiz.outOfAttempts")}
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
  const t = useTranslations("Module");
  let text = "—";
  if (answer) {
    if (kind === "multiple_choice" && "selected_index" in answer) {
      text =
        options?.[answer.selected_index] ??
        t("quiz.optionFallback", { number: answer.selected_index + 1 });
    } else if (kind === "true_false" && "selected" in answer) {
      text = answer.selected ? t("quiz.true") : t("quiz.false");
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

// ============== ALREADY-PASSED VIEW (exportado para casos sin intento nuevo) ==============

export function QuizAlreadyPassed({
  quiz,
  bestScore,
  phaseSlug,
  moduleSlug,
}: {
  quiz: PlayerQuiz;
  bestScore: number;
  phaseSlug: string;
  moduleSlug: string;
}) {
  const t = useTranslations("Module");
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-7 text-emerald-500" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              {t("quiz.quizApproved")}
            </p>
            <p className="font-grotesk text-2xl font-semibold leading-tight">
              {quiz.title}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">{t("quiz.bestScore")}</p>
            <p className="text-2xl font-medium tabular-nums">{bestScore}%</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          render={
            <Link
              href={`/fases/${phaseSlug}/modulos/${moduleSlug}?section=impartation`}
            />
          }
        >
          {t("quiz.continueToImpartation")}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
