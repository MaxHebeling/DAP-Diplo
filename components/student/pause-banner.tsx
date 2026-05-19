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
import { Button } from "@/components/ui/button";

type PauseBannerProps = {
  daysPaused: number;
  currentMonth: number;
  approvedCount: number;
  totalCount: number;
  canRequestExtension: boolean;
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
  const pending_modules = Math.max(0, totalCount - approvedCount);

  // Niveles de aviso (igual que el cron):
  // 0-29: ningún aviso
  // 30-49: amber
  // 50-59: red
  // 60+: no debería verse, ya canceled
  const warningLevel: "none" | "soft" | "urgent" =
    daysPaused >= 50
      ? "urgent"
      : daysPaused >= 30
        ? "soft"
        : "none";

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
      className={[
        "mb-8 overflow-hidden rounded-2xl border",
        warningLevel === "urgent"
          ? "border-red-500/40 bg-red-500/5"
          : warningLevel === "soft"
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-brand-coral/30 bg-brand-coral/5",
      ].join(" ")}
    >
      <div className="flex items-start gap-4 px-6 py-5">
        <div
          className={[
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            warningLevel === "urgent"
              ? "bg-red-500/15 text-red-600"
              : warningLevel === "soft"
                ? "bg-amber-500/15 text-amber-600"
                : "bg-brand-coral/15 text-brand-coral",
          ].join(" ")}
        >
          <PauseCircle className="size-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-medium leading-tight">
            Tu suscripción está pausada.{" "}
            <span className="text-muted-foreground">No se te está cobrando.</span>
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Has aprobado{" "}
            <strong className="text-foreground">
              {approvedCount}/{totalCount}
            </strong>{" "}
            módulos del Mes {currentMonth}. Completa los{" "}
            <strong className="text-foreground">
              {pending_modules}{" "}
              {pending_modules === 1 ? "módulo pendiente" : "módulos pendientes"}
            </strong>{" "}
            para reactivar tu suscripción y avanzar al Mes {currentMonth + 1}.
          </p>

          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Llevas <strong className="text-foreground">{daysPaused}</strong>{" "}
            {daysPaused === 1 ? "día" : "días"} en pausa.
          </p>

          {warningLevel === "soft" && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Atención: tu suscripción se cancelará en{" "}
                <strong>{daysLeft} días</strong> si no retomas.
              </p>
            </div>
          )}

          {warningLevel === "urgent" && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Tu suscripción se cancelará en <strong>{daysLeft} días</strong>.
                Termina los módulos pendientes o pide una extensión.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {canRequestExtension && (
              <Button
                size="sm"
                variant="outline"
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
              </Button>
            )}
            {!canRequestExtension && (
              <p className="text-xs text-muted-foreground">
                Ya usaste tu extensión de esta fase.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
