"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";

type Step = {
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  detail?: string;
};

/**
 * Limpia todo el state local del browser para el origen actual:
 * - Service Workers (unregister)
 * - Caches API (delete all)
 * - localStorage
 * - sessionStorage
 *
 * Útil cuando el SW cacheó una version vieja y los users en mobile no
 * pueden hacer Cmd+Shift+R.
 */
export function CacheClearClient() {
  const [steps, setSteps] = useState<Step[]>([
    { label: "Detectando service workers", status: "pending" },
    { label: "Borrando cachés de la PWA", status: "pending" },
    { label: "Limpiando almacenamiento local", status: "pending" },
  ]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      // Paso 1: unregister SWs
      setStepStatus(0, "running");
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          setStepStatus(0, "done", `${regs.length} unregistered`);
        } else {
          setStepStatus(0, "skipped", "no soportado");
        }
      } catch (err) {
        setStepStatus(0, "error", (err as Error).message);
      }

      // Paso 2: borrar caches
      setStepStatus(1, "running");
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
          setStepStatus(1, "done", `${keys.length} cachés borrados`);
        } else {
          setStepStatus(1, "skipped", "no soportado");
        }
      } catch (err) {
        setStepStatus(1, "error", (err as Error).message);
      }

      // Paso 3: localStorage + sessionStorage
      setStepStatus(2, "running");
      try {
        try {
          localStorage.clear();
        } catch {
          // ignored (puede estar bloqueado por config browser)
        }
        try {
          sessionStorage.clear();
        } catch {
          // ignored
        }
        setStepStatus(2, "done");
      } catch (err) {
        setStepStatus(2, "error", (err as Error).message);
      }

      setDone(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setStepStatus(idx: number, status: Step["status"], detail?: string) {
    setSteps((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], status, detail };
      return copy;
    });
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface-elevated/60 p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-brand-coral/15 text-brand-coral">
          <Trash2 className="size-5" />
        </div>
        <div>
          <h1 className="font-grotesk text-xl font-bold">Limpiar caché DAP</h1>
          <p className="font-inter text-xs text-text-secondary">
            Borrá la caché local y volvé a empezar.
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-md border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
          >
            <StatusIcon status={s.status} />
            <div className="min-w-0 flex-1">
              <p className="font-inter text-sm font-medium text-text-primary">
                {s.label}
              </p>
              {s.detail && (
                <p className="font-inter text-xs text-text-tertiary">
                  {s.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {done && (
        <div className="mt-5 space-y-3">
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.05] p-3 text-center font-inter text-sm text-emerald-300">
            Listo. Caché limpia. Cerrá esta pestaña y abrí el sitio de nuevo.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-md bg-brand-coral px-4 py-3 text-center font-inter text-sm font-semibold text-white hover:bg-brand-coral/90"
          >
            Ir a iniciar sesión
          </Link>
          <Link
            href="/"
            className="block w-full rounded-md border border-white/[0.1] px-4 py-3 text-center font-inter text-sm font-medium text-text-secondary hover:border-white/[0.2] hover:text-text-primary"
          >
            Ir al inicio
          </Link>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: Step["status"] }) {
  if (status === "running") {
    return <Loader2 className="size-4 animate-spin text-brand-coral" />;
  }
  if (status === "done") {
    return <CheckCircle2 className="size-4 text-emerald-400" />;
  }
  if (status === "skipped" || status === "error") {
    return <CheckCircle2 className="size-4 text-text-tertiary" />;
  }
  return <div className="size-4 rounded-full border border-white/[0.2]" />;
}
