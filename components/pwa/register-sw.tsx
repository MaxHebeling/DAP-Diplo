"use client";

import { useEffect } from "react";

/**
 * Registra el service worker en /sw.js apenas la página se hidrata.
 *
 * - Solo en producción (en dev rompe HMR de Next.js)
 * - Idempotente: si ya hay un SW activo, solo verifica updates
 * - Silencioso ante errores (no romper la app si el browser no soporta SW)
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // No registrar en dev — Next.js HMR usa otros service workers/headers
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Update check inmediato + chequeo periódico cada 30min.
          // NO auto-recargamos (causaba loops raros en Safari iOS al
          // volver de background). El SW nuevo toma control la próxima
          // navegación natural del usuario.
          reg.update().catch(() => undefined);
          const interval = setInterval(
            () => {
              reg.update().catch(() => undefined);
            },
            30 * 60 * 1000,
          );
          return () => clearInterval(interval);
        })
        .catch(() => {
          // SW no se pudo registrar — ignoramos silenciosamente
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
