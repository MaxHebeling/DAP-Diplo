"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DapButton } from "@/components/ui-dap/button";
import {
  isEnrollmentOpenLocal,
  msUntilLocalOpen,
} from "@/lib/launch/config";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";

const SEEN_FLAG = "dap.registration-open-popup.seen.v1";

/**
 * Popup "INSCRIPCIONES ABIERTAS" — aparece UNA vez por visitante,
 * cuando el reloj local del browser cruza 01-Jun-2026 00:01.
 *
 * Flujo:
 *  1. Mount: si ya está abierto y nunca se mostró → mostrar.
 *  2. Mount: si todavía no abre → programar setTimeout exacto.
 *  3. Al cerrar → marcar localStorage para no re-aparecer.
 *
 * Diseño anti-flicker: nunca se muestra durante SSR (no toca DOM hasta
 * useEffect). Esto evita hydration warnings entre TZ del server (UTC) y
 * la del browser.
 */
export function RegistrationOpenPopup() {
  const t = useTranslations("Launch.openPopup");
  const onboarding = useOnboarding();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Si ya fue mostrado en este navegador, nunca más.
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(SEEN_FLAG)) return;
    } catch {
      // localStorage podría estar bloqueado (modo privado en Safari, etc.) —
      // en ese caso mostramos siempre, peor caso es ver el popup más veces.
    }

    // setState en effect es intencional: sincronizamos con dos sistemas
    // externos (reloj del browser para chequear si ya abrió la inscripción
    // y localStorage para evitar re-mostrar). El render inicial siempre
    // es open=false (SSR-safe, anti-flicker); el effect decide si abrir.
    if (isEnrollmentOpenLocal()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      return;
    }

    // Aún no abre — programar timeout exacto. Cap a 24h para evitar
    // setTimeout con números absurdos (browsers se portan raro con >24d).
    const wait = Math.min(msUntilLocalOpen(), 24 * 60 * 60 * 1000);
    const timer = window.setTimeout(() => {
      if (isEnrollmentOpenLocal()) setOpen(true);
    }, wait);

    return () => window.clearTimeout(timer);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        window.localStorage.setItem(SEEN_FLAG, String(Date.now()));
      } catch {
        // ignore
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
          <Sparkles className="h-7 w-7" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-center font-grotesk text-2xl font-bold tracking-wide">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            {t("body")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <DapButton
            size="md"
            variant="primary"
            onClick={() => {
              handleOpenChange(false);
              // Dispara el modal de onboarding directamente vía context.
              // Antes este botón linkeaba a /signup → redirect a / (sin abrir
              // nada). Bug detectado en E2E jun-2026.
              onboarding?.open();
            }}
          >
            {t("cta")}
          </DapButton>
          <DapButton
            size="md"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
          >
            {t("close")}
          </DapButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
