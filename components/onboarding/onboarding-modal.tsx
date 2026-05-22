"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { type Country } from "@/lib/data/countries";
import { CountrySelector } from "@/components/onboarding/country-selector";
import { OnboardingSignupForm } from "@/components/onboarding/onboarding-signup-form";

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

  // Resetear al abrir
  useEffect(() => {
    if (open) {
      setStep("country");
      setCountry(null);
    }
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-text-secondary backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-text-primary"
          aria-label="Cerrar"
        >
          <X className="size-4" strokeWidth={2} />
        </button>

        {/* Step content with animated transitions */}
        <div className="relative flex h-full flex-col">
          <AnimatePresence mode="wait" initial={false}>
            {step === "country" && (
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

            {step === "signup" && country && (
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

            {step === "redirecting" && (
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
