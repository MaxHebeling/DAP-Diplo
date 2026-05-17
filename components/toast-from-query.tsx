"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, string> = {
  "already-subscribed": "Ya tienes una suscripción activa.",
  "subscription-canceled": "Tu suscripción fue cancelada.",
};

/**
 * Lee `?toast=<key>` y dispara el mensaje correspondiente vía sonner.
 * Limpia el query param después para que no se re-dispare en refresh.
 */
export function ToastFromQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = params.get("toast");
    if (!key) return;
    if (firedRef.current === key) return;
    firedRef.current = key;

    const msg = MESSAGES[key];
    if (msg) toast(msg);

    const next = new URLSearchParams(params.toString());
    next.delete("toast");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname]);

  return null;
}
