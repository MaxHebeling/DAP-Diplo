"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, { msg: string; type?: "success" | "info" | "warning" }> = {
  "already-subscribed": { msg: "Ya tienes una suscripción activa.", type: "info" },
  "subscription-canceled": { msg: "Tu suscripción fue cancelada.", type: "info" },
  "block-locked": {
    msg: "Aún no tienes acceso a este bloque. Se desbloquea cada 2 meses de suscripción.",
    type: "warning",
  },
  "module-completed": {
    msg: "¡Módulo completado! Sigue al siguiente.",
    type: "success",
  },
  "block-completed": {
    msg: "¡Bloque completado! Pronto recibirás tu rango.",
    type: "success",
  },
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

    const entry = MESSAGES[key];
    if (entry) {
      if (entry.type === "success") toast.success(entry.msg);
      else if (entry.type === "warning") toast.warning(entry.msg);
      else if (entry.type === "info") toast.info(entry.msg);
      else toast(entry.msg);
    }

    const next = new URLSearchParams(params.toString());
    next.delete("toast");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname]);

  return null;
}
