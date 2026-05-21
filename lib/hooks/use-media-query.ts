"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook para reaccionar a `window.matchMedia(query)` de forma compatible
 * con React 19 strict (sin setState-in-effect). Usa useSyncExternalStore
 * para suscribirse al matchMedia y obtener el snapshot sincrónicamente.
 *
 * Durante SSR/Server Components devuelve `false` (no hay window).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => {
      if (typeof window === "undefined") return false;
      return window.matchMedia(query).matches;
    },
    () => false,
  );
}
