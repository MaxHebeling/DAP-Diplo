"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Beacon de visit log para el panel /admin/visitas.
 *
 * En cada cambio de ruta (mount o navegación cliente) hace un POST
 * fire-and-forget a /api/visits/log con la ruta actual. El endpoint
 * extrae país via headers Vercel, hashea la IP con un salt y dedupea
 * por (ip_hash, path) dentro de 30 minutos para no inflar la tabla.
 *
 * Sin PII: nunca manda email, user id, nada identificable del cliente.
 *
 * No mostrar UI. Componente "invisible" — solo monta el efecto.
 *
 * Dónde montar: dentro de cualquier layout cuya zona quieras trackear.
 * Por defecto se monta en app/(public)/layout.tsx (landing y páginas
 * marketing). NO se monta en /dashboard ni /admin — esas son privadas.
 */
export function VisitBeacon() {
  const pathname = usePathname();
  // Evita doble fetch en React 18 StrictMode durante dev.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const referrer =
      typeof document !== "undefined" && document.referrer
        ? document.referrer
        : null;

    // Fire-and-forget. Errores se ignoran — el tracking no debe romper
    // la navegación si Supabase se cae o el endpoint tarda.
    void fetch("/api/visits/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
