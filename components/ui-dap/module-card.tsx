import Link from "next/link";
import { CheckCircle2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { DapButton } from "./button";

type DapModuleCardProps = {
  moduleNumber: number;
  title: string;
  blockName?: string;
  href?: string;
  state?: "available" | "approved" | "locked";
  ctaLabel?: string;
  className?: string;
};

function DapModuleCard({
  moduleNumber,
  title,
  blockName,
  href,
  state = "available",
  ctaLabel,
  className,
}: DapModuleCardProps) {
  const numberLabel = String(moduleNumber).padStart(2, "0");

  const StateIcon =
    state === "approved" ? CheckCircle2 : state === "locked" ? Lock : null;
  const stateColor =
    state === "approved"
      ? "text-emerald-400"
      : state === "locked"
        ? "text-text-tertiary"
        : "text-brand-coral";

  const cta = ctaLabel ?? (state === "approved" ? "Repasar" : "Iniciar");

  return (
    <div
      data-slot="dap-module-card"
      className={cn(
        "group/module flex items-center justify-between gap-4 rounded-lg p-4 transition-colors hover:bg-white/[0.02]",
        state === "locked" && "opacity-60",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={cn(
            "font-grotesk text-h4 font-semibold leading-none tabular-nums transition-colors",
            "text-text-secondary group-hover/module:text-brand-coral",
            state === "locked" && "text-text-tertiary group-hover/module:text-text-tertiary",
          )}
        >
          {numberLabel}
        </span>
        <div className="min-w-0">
          <p className="truncate font-inter text-base font-semibold text-text-primary">
            {title}
          </p>
          {blockName && (
            <p className="truncate font-inter text-sm text-text-secondary">
              {blockName}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {StateIcon && (
          <StateIcon
            className={cn("size-4", stateColor)}
            aria-label={state === "approved" ? "Aprobado" : "Bloqueado"}
          />
        )}
        {state !== "locked" &&
          (href ? (
            <DapButton render={<Link href={href} />} variant="secondary" size="sm">
              {cta}
            </DapButton>
          ) : (
            <DapButton variant="secondary" size="sm" disabled>
              {cta}
            </DapButton>
          ))}
      </div>
    </div>
  );
}

export { DapModuleCard };
