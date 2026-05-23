/**
 * Field input compartido del onboarding (modal + formulario AR matrimonio).
 *
 * Estética premium DAP: label arriba, hint a la derecha cuando no hay
 * error, mensaje de error en coral debajo del input. `fieldCx` provee
 * las clases del input para que <input>/<select> hereden el mismo
 * styling sin acoplarse al componente.
 */

import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  input: ReactNode;
  className?: string;
};

export function Field({ label, hint, error, input, className }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-baseline justify-between">
        <span className="font-inter text-xs font-medium text-text-secondary">
          {label}
        </span>
        {hint && !error && (
          <span className="font-inter text-[10px] text-text-tertiary">
            {hint}
          </span>
        )}
      </label>
      {input}
      {error && (
        <p className="mt-1 font-inter text-xs text-brand-coral">{error}</p>
      )}
    </div>
  );
}

export function fieldCx(hasError: boolean): string {
  return [
    "w-full rounded-xl border bg-white/[0.03] px-4 py-3 font-inter text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary",
    "focus:bg-white/[0.05] focus:ring-4",
    hasError
      ? "border-brand-coral/50 focus:border-brand-coral focus:ring-brand-coral/15"
      : "border-white/[0.08] focus:border-brand-violet/40 focus:ring-brand-violet/15",
  ].join(" ");
}
