"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  PauseCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { DapButton } from "@/components/ui-dap/button";

type PauseBannerProps = {
  daysPaused: number;
  currentMonth: number;
  approvedCount: number;
  totalCount: number;
  canRequestExtension: boolean;
};

type WarningLevel = "none" | "soft" | "urgent";

const LEVEL_BORDER: Record<WarningLevel, string> = {
  none: "border-brand-coral/30 bg-brand-coral/[0.06]",
  soft: "border-amber-500/40 bg-amber-500/[0.06]",
  urgent: "border-red-500/40 bg-red-500/[0.06]",
};

const LEVEL_ICON_BG: Record<WarningLevel, string> = {
  none: "bg-brand-coral/15 text-brand-coral",
  soft: "bg-amber-500/15 text-amber-400",
  urgent: "bg-red-500/15 text-red-400",
};

export function PauseBanner({
  daysPaused,
  currentMonth,
  approvedCount,
  totalCount,
  canRequestExtension,
}: PauseBannerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const daysLeft = Math.max(0, 60 - daysPaused);
  const modulesLeft = Math.max(0, totalCount - approvedCount);

  const warningLevel: WarningLevel =
    daysPaused >= 50 ? "urgent" : daysPaused >= 30 ? "soft" : "none";

  function requestExtension() {
    if (!canRequestExtension) return;
    if (
      !confirm(
        "¿Pedir 60 días extra para esta fase? Solo puedes hacerlo una vez por fase.",
      )
    )
      return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/request-extension", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok || !data.granted) {
          const reason: string = data.reason ?? "unknown";
          const msg =
            reason === "already_extended_in_phase"
              ? "Ya pediste tu extensión para esta fase."
              : reason === "not_paused"
                ? "Tu suscripción no está pausada."
                : reason === "no_active_subscription"
                  ? "No tienes suscripción activa."
                  : (data.error ?? "No se pudo otorgar la extensión.");
          toast.error(msg);
          return;
        }
        toast.success(
          `Extensión otorgada: +${data.days_added ?? 60} días para esta fase.`,
        );
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg);
      }
    });
  }

  return (
    <section
      className={cn(
        "mb-8 overflow-hidden rounded-xl border",
        LEVEL_BORDER[warningLevel],
      )}
    >
      <div className="flex items-start gap-4 px-6 py-5">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            LEVEL_ICON_BG[warningLevel],
          )}
        >
          <PauseCircle className="size-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-grotesk text-h4 font-semibold leading-tight text-text-primary">
            Tu suscripción está pausada.{" "}
            <span className="text-text-secondary font-normal">
              No se te está cobrando.
            </span>
          </h2>

          <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
            Has aprobado{" "}
            <strong className="text-text-primary">
              {approvedCount}/{totalCount}
            </strong>{" "}
            módulos del Mes {currentMonth}. Completa los{" "}
            <strong className="text-text-primary">
              {modulesLeft}{" "}
              {modulesLeft === 1 ? "módulo pendiente" : "módulos pendientes"}
            </strong>{" "}
            para reactivar tu suscripción y avanzar al Mes {currentMonth + 1}.
          </p>

          <p className="mt-3 inline-flex items-center gap-1.5 font-inter text-xs text-text-tertiary">
            <CalendarClock className="size-3.5" />
            Llevas <strong className="text-text-primary">{daysPaused}</strong>{" "}
            {daysPaused === 1 ? "día" : "días"} en pausa.
          </p>

          {warningLevel === "soft" && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-inter text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Atención: tu suscripción se cancelará en{" "}
                <strong>{daysLeft} días</strong> si no retomas.
              </p>
            </div>
          )}

          {warningLevel === "urgent" && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-inter text-xs text-red-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Tu suscripción se cancelará en <strong>{daysLeft} días</strong>.
                Termina los módulos pendientes o pide una extensión.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {canRequestExtension && (
              <DapButton
                size="sm"
                variant="secondary"
                onClick={requestExtension}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CalendarClock className="size-3.5" />
                )}
                {pending
                  ? "Otorgando…"
                  : "Pedir extensión de 60 días para esta fase"}
              </DapButton>
            )}
            {!canRequestExtension && (
              <p className="font-inter text-xs text-text-tertiary">
                Ya usaste tu extensión de esta fase.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
