"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

/**
 * Popup de bienvenida — aparece 4 segundos después del primer load del
 * sitio. Una sola vez por device (persistimos en sessionStorage para
 * que no fastidie al usuario que ya lo vio en esta sesión, pero sí
 * vuelva a aparecer si abre una nueva).
 *
 * Click afuera / botón X / ESC → cierra.
 */
const STORAGE_KEY = "dap-welcome-popup-dismissed";
const DELAY_MS = 4000;

export function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Si ya lo cerró en esta sesión, no volver a mostrar.
    if (typeof window === "undefined") return;
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
          aria-label="Cerrar"
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
        <Image
          src="/welcome-popup.jpg"
          alt="DAP — Bienvenidos · Inicio de clases martes 23 de junio de 2026 · Coming soon"
          width={1280}
          height={720}
          priority
          className="block h-auto w-full"
        />
      </DialogContent>
    </Dialog>
  );
}
