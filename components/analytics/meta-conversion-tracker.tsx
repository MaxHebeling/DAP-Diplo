"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    fbq?: (action: string, event: string, data?: Record<string, unknown>) => void;
  }
}

/**
 * Dispara eventos custom de conversión a Meta Pixel cuando el alumno
 * aterriza en una pantalla de éxito post-pago.
 *
 * Triggers:
 *   - Pathname /suscribirme/exito → Subscribe (sub confirmada Stripe)
 *   - searchParam toast=mp-paid → Subscribe (sub confirmada MP)
 *   - searchParam toast=beca-activa → CompleteRegistration (beca DAP-VIP/HONOR)
 *
 * Monta global en root layout — no-op en otras URLs.
 */
export function MetaConversionTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !window.fbq) return;

    const toast = searchParams.get("toast");

    // Stripe exito
    if (pathname === "/suscribirme/exito") {
      window.fbq("track", "Subscribe", {
        currency: "USD",
        value: 25,
        predicted_ltv: 450, // 18 meses
      });
      return;
    }

    // MP pago confirmado (post-redirect desde MP a /dashboard)
    if (toast === "mp-paid") {
      window.fbq("track", "Subscribe", {
        currency: "ARS",
        value: 30000,
        predicted_ltv: 540000,
      });
      return;
    }

    // Beca activa (cupón DAP-VIP / DAP-HONOR)
    if (toast === "beca-activa") {
      window.fbq("track", "CompleteRegistration", {
        currency: "USD",
        value: 0,
        content_name: "DAP Beca",
      });
      return;
    }

    // MP pending (efectivo aún no acreditado) — opcional, no es conversión todavía
    if (toast === "mp-pending") {
      window.fbq("track", "InitiateCheckout", {
        currency: "ARS",
        value: 30000,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
