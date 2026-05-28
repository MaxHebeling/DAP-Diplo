import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

export type SectionKind =
  | "intro"
  | "teaching"
  | "activation"
  | "evaluation"
  | "impartation";

export type StepperSection = {
  kind: SectionKind;
  title: string;
  completed: boolean;
};

type ModuleStepperProps = {
  sections: StepperSection[];
  current: SectionKind;
  phaseSlug: string;
  moduleSlug: string;
};

const ORDERED: SectionKind[] = [
  "intro",
  "teaching",
  "activation",
  "evaluation",
  "impartation",
];

export async function ModuleStepper({
  sections,
  current,
  phaseSlug,
  moduleSlug,
}: ModuleStepperProps) {
  const t = await getTranslations("Module");
  const LABEL: Record<SectionKind, string> = {
    intro: t("stepper.intro"),
    teaching: t("stepper.teaching"),
    activation: t("stepper.activation"),
    evaluation: t("stepper.evaluation"),
    impartation: t("stepper.impartation"),
  };

  // Keep canonical order even if DB returns them in different order
  const byKind = new Map(sections.map((s) => [s.kind, s]));

  return (
    <nav aria-label={t("stepper.navLabel")} className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1.5 sm:gap-3">
        {ORDERED.map((kind, idx) => {
          const s = byKind.get(kind);
          const isCurrent = current === kind;
          const isCompleted = s?.completed === true;
          return (
            <li key={kind} className="flex items-center gap-1.5 sm:gap-3">
              <Link
                href={`/fases/${phaseSlug}/modulos/${moduleSlug}?section=${kind}`}
                className={cn(
                  "group flex items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isCurrent
                    ? "bg-brand-coral text-brand-coral-foreground"
                    : isCompleted
                      ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                      : "border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    isCurrent
                      ? "bg-brand-coral-foreground/15 text-brand-coral-foreground"
                      : isCompleted
                        ? "bg-emerald-500/20"
                        : "bg-muted",
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : (
                    String(idx + 1)
                  )}
                </span>
                <span>{LABEL[kind]}</span>
              </Link>
              {idx < ORDERED.length - 1 && (
                <span
                  aria-hidden
                  className="h-px w-3 bg-border sm:w-6"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
