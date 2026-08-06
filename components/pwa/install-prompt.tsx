"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
 * Modo forzado con `?install=1` (o `#install`): salta timers, dismissed
 * checks y muestra el prompt de inmediato. Si el browser aún no disparó
 * beforeinstallprompt (típico en Chrome cuando el user no cumple todavía
 * los engagement heuristics), cae a instrucciones manuales del menú.
 *
 * Para iOS Safari NO existe beforeinstallprompt — el modo forzado también
 * les sirve porque muestra las instrucciones manuales.
 */
export function InstallPrompt() {
  const t = useTranslations("Pwa");
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [forced, setForced] = useState(false);

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

    const params = new URLSearchParams(window.location.search);
    const isForced =
      params.get("install") === "1" ||
      window.location.hash === "#install";

    if (isForced) {
      // Modo forzado: mostrar YA sin checks. Si el evento nativo aparece
      // después, lo capturamos igual para poder disparar `.prompt()`.
      setForced(true);
      setVisible(true);
    } else {
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
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      if (!isForced) {
        // Esperar 30s antes de mostrar para no interrumpir
        setTimeout(() => setVisible(true), 30_000);
      }
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

  // Modo normal: solo mostrar si el browser está listo con el evento nativo.
  // Modo forzado (?install=1): mostrar aunque no haya evento — caemos a
  // instrucciones manuales del menú del browser.
  if (!visible) return null;
  if (!forced && !event) return null;

  const showManual = forced && !event;

  return (
    <div
      role="dialog"
      aria-label={t("install.dialogLabel")}
      className={
        forced
          ? "fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border-2 border-brand-coral/60 bg-surface-elevated/98 p-5 shadow-2xl backdrop-blur-xl sm:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
          : "fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-brand-violet/30 bg-surface-elevated/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
      }
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("install.closeLabel")}
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
            {t("install.title")}
          </p>
          <p className="mt-0.5 font-inter text-xs leading-relaxed text-text-secondary">
            {t("install.description")}
          </p>

          {showManual ? (
            <div className="mt-3 space-y-2 rounded-md bg-black/20 p-3 font-inter text-xs leading-relaxed text-text-secondary">
              <p className="font-semibold text-text-primary">
                {t("install.manualTitle")}
              </p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>{t("install.manualStep1")}</li>
                <li>{t("install.manualStep2")}</li>
                <li>{t("install.manualStep3")}</li>
              </ol>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={install}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-coral px-3 py-1.5 font-inter text-xs font-semibold text-white hover:bg-brand-coral/90"
              >
                {t("install.installButton")}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-inter text-xs text-text-tertiary hover:text-text-primary"
              >
                {t("install.dismissButton")}
              </button>
            </div>
          )}

          {showManual && (
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-inter text-xs text-text-tertiary hover:text-text-primary"
            >
              {t("install.dismissButton")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
