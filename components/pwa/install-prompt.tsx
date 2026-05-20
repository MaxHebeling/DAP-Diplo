"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "dap-install-prompt-dismissed-at";
const DISMISS_DAYS = 14;

/**
 * Banner sutil para invitar a instalar la PWA. Aparece solo si:
 * - El browser disparó beforeinstallprompt (Chrome/Edge/Brave Android+desktop)
 * - El usuario no la dimió en los últimos 14 días
 * - No está ya instalada (display-mode: standalone)
 *
 * Para iOS Safari NO existe beforeinstallprompt — agregamos un hint
 * separado si se detecta iOS Safari (no agregado por ahora; opcional).
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Ya instalada?
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS only
      window.navigator.standalone
    ) {
      return;
    }

    // Dimida recientemente?
    try {
      const dismissedAt = localStorage.getItem(DISMISSED_KEY);
      if (dismissedAt) {
        const days = (Date.now() - Number(dismissedAt)) / 86_400_000;
        if (days < DISMISS_DAYS) return;
      }
    } catch {
      // localStorage bloqueado — ignoramos
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      // Esperar 30s antes de mostrar para no interrumpir
      setTimeout(() => setVisible(true), 30_000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignored
    }
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
  }

  if (!visible || !event) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar DAP"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-brand-violet/30 bg-surface-elevated/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-coral/15 text-brand-coral">
          <Download className="size-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-grotesk text-sm font-semibold text-text-primary">
            Instalá DAP en tu celular
          </p>
          <p className="mt-0.5 font-inter text-xs leading-relaxed text-text-secondary">
            Acceso directo al dashboard, recordatorios cuando abre tu módulo
            semanal, sin pasar por el browser.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-coral px-3 py-1.5 font-inter text-xs font-semibold text-white hover:bg-brand-coral/90"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-inter text-xs text-text-tertiary hover:text-text-primary"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
