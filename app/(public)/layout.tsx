"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

import { CustomCursor } from "@/components/landing/custom-cursor";
import { KonamiEasterEgg } from "@/components/landing/konami-easter-egg";
import { WelcomePopup } from "@/components/landing/welcome-popup";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { RegistrationOpenPopup } from "@/components/launch/registration-open-popup";
import { VisitBeacon } from "@/components/leads/visit-beacon";

/**
 * Layout específico de las rutas públicas (landing, /rangos, /precios,
 * /como-funciona, etc.). Agrega:
 * - Page transition fade-in al cambiar de ruta (motion + AnimatePresence
 *   con key=pathname).
 * - CustomCursor: cursor decorativo que crece sobre interactivos.
 * - KonamiEasterEgg: ↑↑↓↓←→←→BA dispara confetti + toast.
 *
 * NO se aplica a /dashboard, /admin, /api — esos heredan solo del root.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <OnboardingProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <CustomCursor />
      <KonamiEasterEgg />
      <WelcomePopup />
      <RegistrationOpenPopup />
      <VisitBeacon />
    </OnboardingProvider>
  );
}
