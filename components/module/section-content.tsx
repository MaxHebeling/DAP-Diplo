import { getTranslations } from "next-intl/server";

import { AdvanceButton } from "@/components/module/advance-button";
import { Markdown } from "@/components/module/markdown";
import {
  QuizPlayer,
  QuizAlreadyPassed,
  type LatestAttemptSummary,
  type PlayerQuestion,
  type PlayerQuiz,
} from "@/components/module/quiz-player";
import {
  ActivationSubmission,
  type ActivationSubmission as ActivationSubmissionData,
} from "@/components/module/activation-submission";

type SectionKind = "intro" | "activation" | "evaluation" | "impartation";

export type EvaluationProps = {
  quiz: PlayerQuiz | null;
  questions: PlayerQuestion[];
  attemptCount: number;
  passed: boolean;
  bestScore: number | null;
  latestAttempt: LatestAttemptSummary | null;
};

export type ActivationProps = {
  submission: ActivationSubmissionData | null;
};

type SectionContentProps = {
  kind: SectionKind;
  sectionId: string;
  moduleId: string;
  phaseSlug: string;
  moduleSlug: string;
  bodyMd: string | null;
  module: {
    objective: string | null;
    main_revelation: string | null;
    impartation_phrase: string | null;
  };
  evaluation?: EvaluationProps;
  activation?: ActivationProps;
};

const NEXT: Record<SectionKind, SectionTeachingKind> = {
  intro: "teaching",
  activation: "evaluation",
  evaluation: "impartation",
  impartation: null,
};

type SectionTeachingKind =
  | "intro"
  | "teaching"
  | "activation"
  | "evaluation"
  | "impartation"
  | null;

export async function SectionContent(props: SectionContentProps) {
  const t = await getTranslations("Module");
  const NEXT_LABEL: Record<SectionKind, string> = {
    intro: t("sectionContent.nextIntro"),
    activation: t("sectionContent.nextActivation"),
    evaluation: t("sectionContent.nextEvaluation"),
    impartation: t("sectionContent.nextImpartation"),
  };
  const next = NEXT[props.kind];
  const isEvaluation = props.kind === "evaluation";
  const hasQuiz = isEvaluation && props.evaluation?.quiz;

  return (
    <div className="space-y-8">
      {/* Render contextual por tipo */}
      {props.kind === "intro" && (
        <IntroExtras
          objective={props.module.objective}
          mainRevelation={props.module.main_revelation}
        />
      )}

      {/* Cuerpo Markdown — intro/impartation lo muestran tal cual; activation
          ahora vive dentro de ActivationSubmission (con la consigna y el form);
          evaluation lo muestra arriba del quiz. */}
      {props.bodyMd && !isEvaluation && props.kind !== "activation" && (
        <Markdown>{props.bodyMd}</Markdown>
      )}
      {props.bodyMd && isEvaluation && (
        <div className="mb-2">
          <Markdown>{props.bodyMd}</Markdown>
        </div>
      )}
      {!props.bodyMd && !isEvaluation && props.kind !== "activation" && (
        <EmptyBodyPlaceholder kind={props.kind} />
      )}

      {/* Activación: form/feedback del Dr. Max */}
      {props.kind === "activation" && (
        <ActivationSubmission
          submission={props.activation?.submission ?? null}
          consignaMd={props.bodyMd}
        />
      )}

      {props.kind === "impartation" && props.module.impartation_phrase && (
        <ImpartationPhrase phrase={props.module.impartation_phrase} />
      )}

      {/* Evaluación: quiz o estado vacío */}
      {isEvaluation &&
        (hasQuiz && props.evaluation!.quiz ? (
          props.evaluation!.passed ? (
            <QuizAlreadyPassed
              quiz={props.evaluation!.quiz}
              bestScore={props.evaluation!.bestScore ?? 100}
              phaseSlug={props.phaseSlug}
              moduleSlug={props.moduleSlug}
            />
          ) : (
            <QuizPlayer
              quiz={props.evaluation!.quiz}
              questions={props.evaluation!.questions}
              attemptCount={props.evaluation!.attemptCount}
              phaseSlug={props.phaseSlug}
              moduleSlug={props.moduleSlug}
              latestAttempt={props.evaluation!.latestAttempt}
            />
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-brand-coral/40 bg-brand-coral/5 p-8 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("sectionContent.evaluationLabel")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("sectionContent.evaluationEmpty")}
            </p>
          </div>
        ))}

      {/* AdvanceButton: oculto en evaluation (el QuizPlayer maneja su propio CTA)
          y en activation (la entrega se valida con la corrección IA, no
          marcando manualmente). */}
      {!isEvaluation && props.kind !== "activation" && (
        <div className="pt-2">
          <AdvanceButton
            sectionId={props.sectionId}
            moduleId={props.moduleId}
            phaseSlug={props.phaseSlug}
            moduleSlug={props.moduleSlug}
            nextSection={next}
            label={NEXT_LABEL[props.kind]}
            done={props.kind === "impartation"}
          />
        </div>
      )}
    </div>
  );
}

// --- subcomponents -----------------------------------------------------

async function IntroExtras({
  objective,
  mainRevelation,
}: {
  objective: string | null;
  mainRevelation: string | null;
}) {
  if (!objective && !mainRevelation) return null;
  const t = await getTranslations("Module");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {objective && (
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("sectionContent.objective")}
          </p>
          <p className="text-sm leading-relaxed text-foreground">{objective}</p>
        </div>
      )}
      {mainRevelation && (
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("sectionContent.mainRevelation")}
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {mainRevelation}
          </p>
        </div>
      )}
    </div>
  );
}

async function ImpartationPhrase({ phrase }: { phrase: string }) {
  const t = await getTranslations("Module");
  return (
    <blockquote className="relative overflow-hidden rounded-2xl border border-brand-coral/30 bg-neutral-950 px-8 py-12 text-center text-neutral-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_30%,rgba(253,173,90,0.16),transparent)]"
      />
      <p className="relative font-grotesk text-2xl font-medium leading-tight sm:text-3xl">
        &ldquo;{phrase}&rdquo;
      </p>
      <p className="relative mt-5 text-xs font-medium uppercase tracking-[0.3em] text-brand-coral">
        {t("sectionContent.impartationPhraseLabel")}
      </p>
    </blockquote>
  );
}

async function EmptyBodyPlaceholder({ kind }: { kind: SectionKind }) {
  const t = await getTranslations("Module");
  const COPY: Record<SectionKind, string> = {
    intro: t("sectionContent.emptyIntro"),
    activation: t("sectionContent.emptyActivation"),
    evaluation: t("sectionContent.emptyEvaluation"),
    impartation: t("sectionContent.emptyImpartation"),
  };
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      {COPY[kind]}
    </div>
  );
}
