"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { isEnrollmentOpenLocal } from "@/lib/launch/config";

/**
 * Popup de bienvenida — aparece 4 segundos después del primer load del
 * sitio. Una sola vez por device (sessionStorage).
 *
 * ⚠ Solo se muestra ANTES de que abran las inscripciones (1-jun-2026).
 * Después contradice el popup "INSCRIPCIONES ABIERTAS" que sí dispara
 * y queda absurdo decir "Coming soon" mientras hay un CTA "Inscribirme
 * ahora" al lado. Bug detectado en E2E jun-2026.
 *
 * Click afuera / botón X / ESC → cierra.
 */
const STORAGE_KEY = "dap-welcome-popup-dismissed";
const DELAY_MS = 4000;

export function WelcomePopup() {
  const t = useTranslations("Landing");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Si ya lo cerró en esta sesión, no volver a mostrar.
    if (typeof window === "undefined") return;
    // Post-launch: no mostrar para evitar contradicción con el popup
    // "INSCRIPCIONES ABIERTAS" que sí aparece pasada esa fecha.
    if (isEnrollmentOpenLocal()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // sessionStorage puede estar bloqueado (incógnito muy restrictivo);
      // si pasa, mostramos el popup igual — peor caso aparece 2x.
    }

    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignored
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-0 bg-transparent p-0 shadow-2xl sm:max-w-2xl"
      >
        <button
          type="button"
          onClick={() => handleOpenChange(false)}
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/80"
          aria-label={t("welcomePopup.closeAria")}
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
        <Image
          src="/welcome-popup.jpg"
          alt={t("welcomePopup.imageAlt")}
          width={1280}
          height={720}
          priority
          className="block h-auto w-full"
        />
      </DialogContent>
    </Dialog>
  );
}
