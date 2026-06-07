"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
 *
 * Deep link: el query param `?open=signup` abre el modal automáticamente.
 * Esto permite que /signup (deprecated, redirect a /?open=signup) y links
 * externos viejos sigan funcionando — el alumno aterriza directo en el
 * modal en lugar del home con el CTA escondido.
 */
export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const openParam = searchParams?.get("open");

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (openParam === "signup") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(true);
    }
  }, [openParam]);

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
