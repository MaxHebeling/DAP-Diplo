"use client";

import { AR_PROVINCES, AR_DIAL_CODE } from "@/lib/data/argentina";

export type SpouseData = {
  fullName: string;
  email: string;
  phone: string;
  province: string;
  ministry: string;
};

export const EMPTY_SPOUSE: SpouseData = {
  fullName: "",
  email: "",
  phone: AR_DIAL_CODE + " ",
  province: "",
  ministry: "",
};

type Props = {
  prefix: string;             // ej "spouse_1" — para autocomplete + aria
  legendNumber: 1 | 2;
  data: SpouseData;
  errors: Partial<Record<keyof SpouseData, string>>;
  disabled?: boolean;
  onChange: (next: SpouseData) => void;
  hideName?: boolean;         // Cónyuge 1 usa el "Nombre completo" general
  hideMinistry?: boolean;     // Cónyuge 1 usa el "Ministerio" general
};

export function SpouseFields({
  prefix,
  legendNumber,
  data,
  errors,
  disabled,
  onChange,
  hideName,
  hideMinistry,
}: Props) {
  function set<K extends keyof SpouseData>(key: K, val: SpouseData[K]) {
    onChange({ ...data, [key]: val });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand-violet/20 font-grotesk text-[11px] font-bold text-brand-violet">
          {legendNumber}
        </span>
        <p className="font-grotesk text-sm font-semibold text-text-primary">
          Cónyuge {legendNumber}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {!hideName && (
          <Field
            label="Nombre completo"
            error={errors.fullName}
            className="sm:col-span-2"
            input={
              <input
                type="text"
                value={data.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                autoComplete={`section-${prefix} name`}
                disabled={disabled}
                className={fieldCx(!!errors.fullName)}
              />
            }
          />
        )}

        <Field
          label="Correo electrónico"
          error={errors.email}
          input={
            <input
              type="email"
              value={data.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete={`section-${prefix} email`}
              disabled={disabled}
              className={fieldCx(!!errors.email)}
            />
          }
        />

        <Field
          label="WhatsApp / Teléfono"
          hint={`Formato: ${AR_DIAL_CODE} 11 1234 5678`}
          error={errors.phone}
          input={
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => set("phone", e.target.value)}
              autoComplete={`section-${prefix} tel`}
              disabled={disabled}
              className={fieldCx(!!errors.phone)}
              placeholder={`${AR_DIAL_CODE} `}
            />
          }
        />

        <Field
          label="Provincia"
          error={errors.province}
          className="sm:col-span-2"
          input={
            <select
              value={data.province}
              onChange={(e) => set("province", e.target.value)}
              disabled={disabled}
              className={fieldCx(!!errors.province)}
            >
              <option value="">Seleccioná tu provincia...</option>
              {AR_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          }
        />

        {!hideMinistry && (
          <Field
            label="Ministerio / iglesia"
            hint="Opcional"
            className="sm:col-span-2"
            input={
              <input
                type="text"
                value={data.ministry}
                onChange={(e) => set("ministry", e.target.value)}
                disabled={disabled}
                className={fieldCx(false)}
              />
            }
          />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  input,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  input: React.ReactNode;
  className?: string;
}) {
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

function fieldCx(hasError: boolean): string {
  return [
    "w-full rounded-xl border bg-white/[0.03] px-4 py-3 font-inter text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary",
    "focus:bg-white/[0.05] focus:ring-4",
    hasError
      ? "border-brand-coral/50 focus:border-brand-coral focus:ring-brand-coral/15"
      : "border-white/[0.08] focus:border-brand-violet/40 focus:ring-brand-violet/15",
  ].join(" ");
}
