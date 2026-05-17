import { AdvanceButton } from "@/components/module/advance-button";
import { Markdown } from "@/components/module/markdown";

type SectionKind = "intro" | "activation" | "evaluation" | "impartation";

type SectionContentProps = {
  kind: SectionKind;
  sectionId: string;
  moduleId: string;
  blockSlug: string;
  moduleSlug: string;
  bodyMd: string | null;
  module: {
    objective: string | null;
    main_revelation: string | null;
    impartation_phrase: string | null;
  };
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

const NEXT_LABEL: Record<SectionKind, string> = {
  intro: "Continuar a Enseñanza",
  activation: "Marqué como hecho",
  evaluation: "Saltar",
  impartation: "Completar módulo",
};

export function SectionContent(props: SectionContentProps) {
  const next = NEXT[props.kind];

  return (
    <div className="space-y-8">
      {/* Render contextual por tipo */}
      {props.kind === "intro" && (
        <IntroExtras
          objective={props.module.objective}
          mainRevelation={props.module.main_revelation}
        />
      )}

      {props.bodyMd ? (
        <Markdown>{props.bodyMd}</Markdown>
      ) : (
        <EmptyBodyPlaceholder kind={props.kind} />
      )}

      {props.kind === "impartation" && props.module.impartation_phrase && (
        <ImpartationPhrase phrase={props.module.impartation_phrase} />
      )}

      {props.kind === "evaluation" && (
        <div className="rounded-2xl border border-dashed border-brand-coral/40 bg-brand-coral/5 p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
            Evaluación
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            El quiz interactivo se habilita en la <strong>Fase 5</strong>{" "}
            del desarrollo. Por ahora puedes saltar a la impartición.
          </p>
        </div>
      )}

      <div className="pt-2">
        <AdvanceButton
          sectionId={props.sectionId}
          moduleId={props.moduleId}
          blockSlug={props.blockSlug}
          moduleSlug={props.moduleSlug}
          nextSection={next}
          label={NEXT_LABEL[props.kind]}
          done={props.kind === "impartation"}
        />
      </div>
    </div>
  );
}

// --- subcomponents -----------------------------------------------------

function IntroExtras({
  objective,
  mainRevelation,
}: {
  objective: string | null;
  mainRevelation: string | null;
}) {
  if (!objective && !mainRevelation) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {objective && (
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Objetivo
          </p>
          <p className="text-sm leading-relaxed text-foreground">{objective}</p>
        </div>
      )}
      {mainRevelation && (
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Revelación principal
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {mainRevelation}
          </p>
        </div>
      )}
    </div>
  );
}

function ImpartationPhrase({ phrase }: { phrase: string }) {
  return (
    <blockquote className="relative overflow-hidden rounded-2xl border border-brand-coral/30 bg-neutral-950 px-8 py-12 text-center text-neutral-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_30%,rgba(253,173,90,0.16),transparent)]"
      />
      <p className="relative font-serif text-2xl font-medium leading-tight sm:text-3xl">
        &ldquo;{phrase}&rdquo;
      </p>
      <p className="relative mt-5 text-xs font-medium uppercase tracking-[0.3em] text-brand-coral">
        Frase de impartición
      </p>
    </blockquote>
  );
}

function EmptyBodyPlaceholder({ kind }: { kind: SectionKind }) {
  const COPY: Record<SectionKind, string> = {
    intro:
      "Aún no se ha publicado la introducción de este módulo. El admin la edita desde el backoffice.",
    activation:
      "Aún no se ha publicado el ejercicio de activación.",
    evaluation:
      "La evaluación se habilita en Fase 5.",
    impartation:
      "Aún no se ha publicado la palabra de cierre.",
  };
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      {COPY[kind]}
    </div>
  );
}
