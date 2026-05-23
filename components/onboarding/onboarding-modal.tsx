"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, GraduationCap, Loader2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { type Country } from "@/lib/data/countries";
import { CountrySelector } from "@/components/onboarding/country-selector";
import { OnboardingSignupForm } from "@/components/onboarding/onboarding-signup-form";
import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
  isEnrollmentOpen,
} from "@/lib/launch/config";

type Step = "country" | "signup" | "redirecting";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Modal de onboarding premium en 3 pasos:
 *
 *   1. CountrySelector — selección visual de país con flags
 *   2. OnboardingSignupForm — formulario de cuenta con país pre-seleccionado
 *   3. Loading state mientras redirigimos a Stripe Checkout
 *
 * Toda la transición es client-side sin recargar página, con
 * framer-motion para entradas/salidas suaves.
 */
export function OnboardingModal({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState<Country | null>(null);

  // El gate del launch se evalúa al abrir. Si está cerrado, mostramos
  // la pantalla "Próximamente" en lugar del flujo. La condición se
  // re-evalúa cada render — cuando llegue el 01 Jun, no hay que tocar
  // código: el modal pasa a mostrar el selector solo.
  const enrollmentOpen = isEnrollmentOpen();

  // Reset al cerrar (no en effect — evita cascading renders).
  function handleOpenChange(next: boolean) {
    if (!next) {
      setStep("country");
      setCountry(null);
    }
    onOpenChange(next);
  }

  function handleCountrySelect(c: Country) {
    setCountry(c);
    setStep("signup");
  }

  function handleSignupSuccess(checkoutUrl: string) {
    setStep("redirecting");
    // Pequeño delay para que se vea la transición antes de leave the page
    setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 700);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[calc(100vh-2rem)] max-h-[760px] w-full max-w-3xl overflow-hidden border-white/[0.06] bg-surface-base/95 p-0 shadow-2xl backdrop-blur-xl sm:h-[760px]"
      >
        {/* Neural/futuristic background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background:radial-gradient(60%_45%_at_30%_30%,rgba(123,97,255,0.25),transparent_60%),radial-gradient(50%_40%_at_72%_75%,rgba(255,77,109,0.18),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [background:linear-gradient(180deg,rgba(7,20,43,0.92),rgba(7,20,43,0.98))]"
        />

        {/* Close button (always visible) */}
        <button
          type="button"
          onClick={() => handleOpenChange(false)}
          className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-text-secondary backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-text-primary"
          aria-label="Cerrar"
        >
          <X className="size-4" strokeWidth={2} />
        </button>

        {/* Step content with animated transitions */}
        <div className="relative flex h-full flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {!enrollmentOpen && (
              <motion.div
                key="closed"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center sm:px-12"
              >
                <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
                  <CalendarClock className="size-8" strokeWidth={1.6} />
                </div>
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-brand-coral">
                  Próximamente
                </p>
                <h2 className="mt-3 font-grotesk text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
                  Inscripciones abren el {ENROLLMENT_OPENS_LABEL}
                </h2>
                <p className="mt-4 max-w-md font-inter text-sm leading-relaxed text-text-secondary">
                  La primera convocatoria del Diplomado Apostólico Pastoral
                  abre inscripciones el{" "}
                  <span className="font-semibold text-text-primary">
                    {ENROLLMENT_OPENS_LABEL}
                  </span>
                  . Volvé en esa fecha para asegurar tu lugar.
                </p>

                <div className="mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-brand-violet/25 bg-brand-violet/[0.08] p-4 text-left">
                  <GraduationCap className="mt-0.5 size-5 shrink-0 text-brand-violet" />
                  <p className="font-inter text-sm leading-relaxed text-text-secondary">
                    <span className="font-semibold text-text-primary">
                      Inicio de clases:
                    </span>{" "}
                    <span className="capitalize">{CLASSES_START_LABEL}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 font-inter text-xs font-medium text-text-secondary backdrop-blur-sm transition-all hover:bg-white/[0.07] hover:text-text-primary"
                >
                  Cerrar
                </button>
              </motion.div>
            )}

            {enrollmentOpen && step === "country" && (
              <motion.div
                key="country"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                <CountrySelector onSelect={handleCountrySelect} />
              </motion.div>
            )}

            {enrollmentOpen && step === "signup" && country && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col"
              >
                <OnboardingSignupForm
                  country={country}
                  onBack={() => setStep("country")}
                  onSuccess={handleSignupSuccess}
                />
              </motion.div>
            )}

            {enrollmentOpen && step === "redirecting" && (
              <motion.div
                key="redirecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
              >
                <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-brand-coral/15">
                  <Loader2 className="size-8 animate-spin text-brand-coral" />
                </div>
                <h2 className="font-grotesk text-2xl font-bold text-text-primary">
                  Llevándote al pago seguro
                </h2>
                <p className="mt-3 max-w-sm font-inter text-sm leading-relaxed text-text-secondary">
                  Conectando con Stripe. Tu suscripción se activa
                  inmediatamente después del pago.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
