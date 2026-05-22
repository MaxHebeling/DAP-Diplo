"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

type Question = {
  q: string;
  options: string[];
  correct: number; // index
  explanation: string;
};

// Preguntas sample del módulo 1 — Reino de Dios.
// Cuando Max produzca el quiz real, los reemplazamos por DB query.
const QUESTIONS: Question[] = [
  {
    q: "Según la enseñanza, el Reino de Dios es principalmente:",
    options: [
      "Un lugar futuro al que vamos cuando morimos",
      "Una metáfora de la iglesia local",
      "El gobierno presente de Dios operando en el ahora",
      "Una promesa que se cumplirá solo en el milenio",
    ],
    correct: 2,
    explanation:
      "Jesús predicó: «El reino de Dios se ha acercado» (Mt 4:17). No es un lugar futuro sino el gobierno presente del Rey, operando aquí y ahora donde se reconoce su autoridad.",
  },
  {
    q: "¿Cuál de estas NO es una manifestación directa del Reino en la vida del pastor?",
    options: [
      "Autoridad sobre las áreas que el Padre te entregó",
      "Acumulación de seguidores en redes sociales",
      "Capacidad de discernir el orden del Reino en lo familiar y ministerial",
      "Identidad de hijo que reemplaza la mentalidad de huérfano",
    ],
    correct: 1,
    explanation:
      "Las 3 opciones correctas (autoridad, discernimiento, identidad de hijo) son frutos del Reino operando. Acumular seguidores puede ocurrir sin que el Reino esté presente — y muchas veces lo bloquea cuando la motivación es la propia gloria.",
  },
  {
    q: "El pasaje ancla del módulo es:",
    options: [
      "Juan 3:16",
      "Mateo 6:33 — «Buscad primeramente el reino de Dios»",
      "1 Corintios 13:13",
      "Génesis 1:1",
    ],
    correct: 1,
    explanation:
      "Mateo 6:33 establece la prioridad apostólica: buscar el Reino primero. Todo lo demás (provisión, dirección, fruto ministerial) viene como añadidura, no como objetivo.",
  },
];

const PASS_THRESHOLD = 70;

export function DemoQuiz() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = QUESTIONS.every((_, i) => answers[i] !== undefined);
  const correctCount = QUESTIONS.filter(
    (q, i) => answers[i] === q.correct,
  ).length;
  const score = Math.round((correctCount / QUESTIONS.length) * 100);
  const passed = score >= PASS_THRESHOLD;

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface-elevated/60 p-6 backdrop-blur-sm sm:p-8">
      {!submitted ? (
        <>
          <div className="space-y-8">
            {QUESTIONS.map((q, qIdx) => (
              <div key={qIdx}>
                <p className="mb-4 font-grotesk text-base font-semibold text-text-primary">
                  {qIdx + 1}. {q.q}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => {
                    const selected = answers[qIdx] === oIdx;
                    return (
                      <label
                        key={oIdx}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                          selected
                            ? "border-brand-coral bg-brand-coral/[0.08]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.16]",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name={`q-${qIdx}`}
                          value={oIdx}
                          checked={selected}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                          }
                          className="mt-0.5 accent-brand-coral"
                        />
                        <span className="font-inter text-sm leading-relaxed text-text-primary">
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!allAnswered}
            className={[
              "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-inter text-sm font-semibold transition-all",
              allAnswered
                ? "bg-gradient-to-br from-brand-violet to-brand-coral text-white hover:scale-[1.01]"
                : "cursor-not-allowed bg-white/[0.04] text-text-tertiary",
            ].join(" ")}
          >
            {allAnswered
              ? "Ver mi resultado"
              : `Respondé las ${QUESTIONS.length} preguntas para continuar`}
          </button>
        </>
      ) : (
        <div>
          {/* Resultado */}
          <div
            className={[
              "mb-8 rounded-xl border p-6 text-center",
              passed
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-brand-coral/30 bg-brand-coral/10",
            ].join(" ")}
          >
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-text-secondary">
              Tu resultado
            </p>
            <p
              className={[
                "mt-2 font-grotesk text-display font-bold leading-none",
                passed ? "text-emerald-300" : "text-brand-coral",
              ].join(" ")}
            >
              {score}%
            </p>
            <p className="mt-3 font-inter text-sm text-text-secondary">
              {correctCount} de {QUESTIONS.length} correctas ·{" "}
              {passed ? (
                <span className="font-semibold text-emerald-300">
                  ¡Aprobado! (≥ 70%)
                </span>
              ) : (
                <span className="font-semibold text-brand-coral">
                  No aprobado — necesitás 70% mínimo
                </span>
              )}
            </p>
          </div>

          {/* Review pregunta por pregunta */}
          <div className="space-y-5">
            {QUESTIONS.map((q, qIdx) => {
              const userAns = answers[qIdx];
              const correct = userAns === q.correct;
              return (
                <div
                  key={qIdx}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start gap-3">
                    {correct ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 size-5 shrink-0 text-brand-coral" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-grotesk text-sm font-semibold text-text-primary">
                        {qIdx + 1}. {q.q}
                      </p>
                      <p className="mt-2 font-inter text-xs text-text-tertiary">
                        Tu respuesta:{" "}
                        <span
                          className={
                            correct ? "text-emerald-300" : "text-brand-coral"
                          }
                        >
                          {q.options[userAns]}
                        </span>
                      </p>
                      {!correct && (
                        <p className="mt-1 font-inter text-xs text-text-tertiary">
                          Correcta:{" "}
                          <span className="text-emerald-300">
                            {q.options[q.correct]}
                          </span>
                        </p>
                      )}
                      <p className="mt-3 rounded-md border-l-2 border-brand-violet bg-brand-violet/[0.05] px-3 py-2 font-inter text-xs leading-relaxed text-text-secondary">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center gap-1.5 font-inter text-xs font-medium text-brand-coral hover:underline"
          >
            <RotateCcw className="size-3.5" />
            Volver a intentar
          </button>
        </div>
      )}
    </div>
  );
}
