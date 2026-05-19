import * as React from "react";

import { cn } from "@/lib/utils";

type DapInputFieldProps = React.ComponentProps<"input"> & {
  label?: string;
  hint?: string;
  error?: string;
};

function DapInputField({
  className,
  label,
  hint,
  error,
  id,
  type = "text",
  ...props
}: DapInputFieldProps) {
  const reactId = React.useId();
  const inputId = id ?? reactId;
  const describedById =
    error || hint ? `${inputId}-msg` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-inter text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        aria-invalid={!!error || undefined}
        aria-describedby={describedById}
        data-slot="dap-input-field"
        className={cn(
          "w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-inter text-base text-text-primary outline-none transition-colors",
          "placeholder:text-text-tertiary",
          "focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-brand-coral focus:border-brand-coral focus:ring-brand-coral/30",
          className,
        )}
        {...props}
      />
      {(error || hint) && (
        <p
          id={describedById}
          className={cn(
            "font-inter text-xs",
            error ? "text-brand-coral" : "text-text-tertiary",
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export { DapInputField };
