"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowRight, CheckCircle2, X } from "lucide-react";

export type TourStep = {
  // Selector CSS del elemento a highlightear. Si no se encuentra, el step se centra en la pantalla.
  target?: string;
  title: string;
  body: string;
  // Posición del tooltip relativa al target. Default 'bottom'.
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

const STORAGE_KEY = "dap-tour-completed-v1";

/**
 * Onboarding interactivo. Se monta una sola vez por dispositivo (flag
 * en localStorage). Si el user clickea "Skip" o "Listo" se guarda y no
 * vuelve a aparecer.
 *
 * Cada step se ancla a un selector CSS del DOM (data-tour="..."). Si el
 * selector no encuentra nada, el tooltip se centra en pantalla.
 */
export function Tour({ steps, autoStart = true }: { steps: TourStep[]; autoStart?: boolean }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!autoStart) return;
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // ignored
    }
    // Pequeño delay para que la página termine de hidratar
    const t = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(t);
  }, [autoStart]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // ignored
    }
    setActive(false);
  }

  if (!active || steps.length === 0) return null;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <TourOverlay step={step} onClose={finish}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-inter text-[11px] text-text-tertiary">
          Paso {index + 1} de {steps.length}
        </p>
        <div className="flex items-center gap-2">
          {!isLast ? (
            <>
              <button
                type="button"
                onClick={finish}
                className="rounded-md px-2 py-1 font-inter text-xs text-text-tertiary hover:text-text-secondary"
              >
                Saltar
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="inline-flex items-center gap-1 rounded-md bg-brand-coral px-3 py-1.5 font-inter text-xs font-semibold text-white hover:bg-brand-coral/90"
              >
                Siguiente
                <ArrowRight className="size-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center gap-1 rounded-md bg-brand-coral px-3 py-1.5 font-inter text-xs font-semibold text-white hover:bg-brand-coral/90"
            >
              <CheckCircle2 className="size-3.5" />
              Listo
            </button>
          )}
        </div>
      </div>
    </TourOverlay>
  );
}

// ---------- Overlay + posicionamiento ----------

function TourOverlay({
  step,
  children,
  onClose,
}: {
  step: TourStep;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    function recalc() {
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      // Scroll el target a viewport si está fuera
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      } catch {
        // ignored
      }
      setRect(el.getBoundingClientRect());
    }
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [step.target]);

  const placement = step.placement ?? "bottom";
  const isCentered = !rect || placement === "center";

  // Tooltip position (fixed)
  const tooltipStyle: React.CSSProperties = isCentered
    ? {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "calc(100vw - 24px)",
      }
    : computeTooltipPosition(rect!, placement);

  return (
    <div className="fixed inset-0 z-[200] animate-in fade-in duration-300">
      {/* Backdrop con cutout opcional */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
      />
      {/* Highlight ring sobre el target */}
      {rect && !isCentered && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-4 ring-brand-coral ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      )}
      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className="w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-brand-coral/30 bg-surface-elevated p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-300"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar tour"
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary"
        >
          <X className="size-3.5" />
        </button>
        <h3 className="pr-6 font-grotesk text-sm font-semibold text-text-primary">
          {step.title}
        </h3>
        <p className="mt-1.5 font-inter text-xs leading-relaxed text-text-secondary">
          {step.body}
        </p>
        <div className="mt-3 border-t border-white/[0.06] pt-3">{children}</div>
      </div>
    </div>
  );
}

function computeTooltipPosition(
  rect: DOMRect,
  placement: "top" | "bottom" | "left" | "right",
): React.CSSProperties {
  const tooltipWidth = 320;
  const tooltipGap = 16;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const style: React.CSSProperties = { position: "fixed" };

  switch (placement) {
    case "top":
      style.left = Math.max(
        12,
        Math.min(vw - tooltipWidth - 12, rect.left + rect.width / 2 - tooltipWidth / 2),
      );
      style.bottom = vh - rect.top + tooltipGap;
      break;
    case "left":
      style.right = vw - rect.left + tooltipGap;
      style.top = Math.max(12, rect.top);
      break;
    case "right":
      style.left = rect.right + tooltipGap;
      style.top = Math.max(12, rect.top);
      break;
    case "bottom":
    default:
      style.left = Math.max(
        12,
        Math.min(vw - tooltipWidth - 12, rect.left + rect.width / 2 - tooltipWidth / 2),
      );
      style.top = rect.bottom + tooltipGap;
      // Si se sale por abajo, ponerlo arriba
      if (rect.bottom + 200 > vh) {
        delete style.top;
        style.bottom = vh - rect.top + tooltipGap;
      }
      break;
  }
  return style;
}
