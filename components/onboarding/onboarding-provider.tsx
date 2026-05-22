"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { OnboardingModal } from "@/components/onboarding/onboarding-modal";

type Ctx = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const OnboardingContext = createContext<Ctx | null>(null);

/**
 * Provider global del modal de onboarding. Se monta UNA vez en
 * app/(public)/layout.tsx y cualquier botón puede triggear el modal
 * vía useOnboarding().open().
 */
export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <OnboardingContext.Provider value={{ open, close, isOpen }}>
      {children}
      <OnboardingModal open={isOpen} onOpenChange={setIsOpen} />
    </OnboardingContext.Provider>
  );
}

/**
 * Devuelve el contexto o `null` si no hay provider montado.
 * Permite a los componentes detectar el contexto y caer a un comportamiento
 * legacy cuando se renderizan fuera de la zona pública (ej. dashboard).
 */
export function useOnboarding(): Ctx | null {
  return useContext(OnboardingContext);
}
