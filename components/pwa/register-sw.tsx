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
          // Update check inmediato (no esperar al primer 60min tick)
          reg.update().catch(() => undefined);

          // Si ya hay un SW nuevo esperando, recargar para que tome control
          if (reg.waiting) {
            window.location.reload();
            return;
          }

          // Auto-reload cuando aparece un SW nuevo durante la sesión
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                window.location.reload();
              }
            });
          });

          // Verificar updates cada 30 min mientras la pestaña está abierta
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
