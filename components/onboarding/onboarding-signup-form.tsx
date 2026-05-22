"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";

import { type Country } from "@/lib/data/countries";
import { SignInWithGoogle } from "@/components/auth/google-button";

type Props = {
  country: Country;
  onBack: () => void;
  onSuccess: (checkoutUrl: string) => void;
};

export function OnboardingSignupForm({ country, onBack, onSuccess }: Props) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [ministryName, setMinistryName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 3) {
      e.fullName = "Mínimo 3 caracteres.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Email inválido.";
    }
    if (password.length < 8) {
      e.password = "Mínimo 8 caracteres.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            ministryName: ministryName.trim() || null,
            country: country.name,
            countryCode: country.code,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          checkoutUrl?: string;
          error?: string;
        };
        if (!res.ok || !body.ok || !body.checkoutUrl) {
          toast.error(body.error ?? "No se pudo completar el registro.");
          return;
        }
        toast.success("Cuenta creada. Redirigiendo al pago seguro...");
        onSuccess(body.checkoutUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error de red";
        toast.error(msg);
      }
    });
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="px-8 pb-2 pt-8 sm:px-10 sm:pt-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className="inline-flex items-center gap-1.5 font-inter text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" />
            Cambiar país
          </button>
          <span className="font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
            Paso 2 de 2
          </span>
        </div>

        {/* Country chip */}
        <div className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-brand-violet/30 bg-brand-violet/[0.08] px-3.5 py-1.5">
          <span className="text-base">{country.flag}</span>
          <span className="font-inter text-xs font-medium text-text-primary">
            {country.name}
          </span>
        </div>

        <h2 className="mt-5 font-grotesk text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
          Creá tu cuenta
        </h2>
        <p className="mt-3 max-w-md font-inter text-sm leading-relaxed text-text-secondary">
          Después de esto pasás directo al pago seguro para activar
          tu suscripción mensual.
        </p>
      </div>

      {/* Scrollable form */}
      <div className="mt-5 flex-1 overflow-y-auto px-8 pb-8 sm:px-10 sm:pb-10">
        {/* Google OAuth */}
        <div className="space-y-3">
          <SignInWithGoogle redirectTo="/suscribirme" label="Continuar con Google" />
        </div>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-white/[0.06]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface-elevated px-3 font-inter text-xs uppercase tracking-widest text-text-tertiary">
              o con tu correo
            </span>
          </div>
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field
            label="Nombre completo"
            error={errors.fullName}
            input={
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={pending}
                className={fieldCx(!!errors.fullName)}
              />
            }
          />
          <Field
            label="Correo electrónico"
            error={errors.email}
            input={
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={pending}
                className={fieldCx(!!errors.email)}
              />
            }
          />
          <Field
            label="Contraseña"
            hint="Mínimo 8 caracteres"
            error={errors.password}
            input={
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={pending}
                className={fieldCx(!!errors.password)}
              />
            }
          />
          <Field
            label="Ministerio / iglesia"
            hint="Opcional — completá después si querés"
            input={
              <input
                type="text"
                value={ministryName}
                onChange={(e) => setMinistryName(e.target.value)}
                disabled={pending}
                className={fieldCx(false)}
              />
            }
          />

          <button
            type="submit"
            disabled={pending}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-violet via-brand-coral to-brand-violet bg-[length:200%_100%] bg-left px-6 py-3.5 font-inter text-sm font-semibold text-white shadow-lg shadow-brand-coral/20 transition-all hover:bg-right disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              <>
                Continuar al pago
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          {/* Trust badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 font-inter text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              Sin compromiso
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              Cancelás cuando quieras
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3 text-brand-coral" />
              Stripe seguro
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  input,
}: {
  label: string;
  hint?: string;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div>
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
