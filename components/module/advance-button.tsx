"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { markSectionCompleted } from "@/lib/progress/actions";

type AdvanceButtonProps = {
  sectionId: string;
  moduleId: string;
  phaseSlug: string;
  moduleSlug: string;
  nextSection:
    | "intro"
    | "teaching"
    | "activation"
    | "evaluation"
    | "impartation"
    | null;
  label: string;
  variant?: "default" | "outline" | "secondary";
  done?: boolean;
  /**
   * Si está en true, el form action no se ejecuta y el botón se
   * muestra bloqueado con `disabledReason` como label visible.
   * Útil para gating por video completo, quiz aprobado, etc.
   */
  disabled?: boolean;
  disabledReason?: string;
};

function SubmitInner({
  label,
  done,
  disabled,
  disabledReason,
}: {
  label: string;
  done?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { pending } = useFormStatus();
  const t = useTranslations("Module");
  const isDisabled = disabled || pending;

  if (disabled && !pending) {
    return (
      <Button
        type="button"
        size="lg"
        disabled
        className="h-11 cursor-not-allowed bg-muted/40 text-text-tertiary transition-all"
      >
        <Lock className="size-4" strokeWidth={2} />
        {disabledReason ?? label}
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      size="lg"
      disabled={isDisabled}
      className="h-11 bg-brand text-brand-foreground transition-all hover:bg-brand/90"
    >
      {/* Optimistic UI: apenas se aprieta el botón mostramos check + label
          afirmativo. Si el server falla, el form state lo refleja después. */}
      {pending ? (
        <>
          <Check className="size-4 animate-in fade-in duration-150" />
          {t("advanceButton.done")}
        </>
      ) : (
        <>
          {done && <Check className="size-4" />}
          {label}
          {!done && <ArrowRight className="size-4" />}
        </>
      )}
    </Button>
  );
}

export function AdvanceButton(props: AdvanceButtonProps) {
  const [state, formAction] = useActionState(markSectionCompleted, {
    ok: true as const,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="sectionId" value={props.sectionId} />
      <input type="hidden" name="moduleId" value={props.moduleId} />
      <input type="hidden" name="phaseSlug" value={props.phaseSlug} />
      <input type="hidden" name="moduleSlug" value={props.moduleSlug} />
      {props.nextSection && (
        <input type="hidden" name="next" value={props.nextSection} />
      )}
      <SubmitInner
        label={props.label}
        done={props.done}
        disabled={props.disabled}
        disabledReason={props.disabledReason}
      />
      {!state.ok && (
        <p className="mt-2 text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
