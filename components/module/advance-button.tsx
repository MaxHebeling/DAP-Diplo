"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markSectionCompleted } from "@/lib/progress/actions";

type AdvanceButtonProps = {
  sectionId: string;
  moduleId: string;
  phaseSlug: string;
  moduleSlug: string;
  nextSection: "intro" | "teaching" | "activation" | "evaluation" | "impartation" | null;
  label: string;
  variant?: "default" | "outline" | "secondary";
  done?: boolean;
};

function SubmitInner({ label, done }: { label: string; done?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-11 bg-brand text-brand-foreground hover:bg-brand/90 transition-all"
    >
      {/* Optimistic UI: apenas se aprieta el botón mostramos check + label
          afirmativo. Si el server falla, el form state lo refleja después. */}
      {pending ? (
        <>
          <Check className="size-4 animate-in fade-in duration-150" />
          ¡Listo!
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
      <SubmitInner label={props.label} done={props.done} />
      {!state.ok && (
        <p className="mt-2 text-xs text-destructive">{state.error}</p>
      )}
    </form>
  );
}
