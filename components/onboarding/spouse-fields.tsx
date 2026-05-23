"use client";

import { AR_PROVINCES, AR_DIAL_CODE } from "@/lib/data/argentina";
import { Field, fieldCx } from "@/components/onboarding/field";

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

