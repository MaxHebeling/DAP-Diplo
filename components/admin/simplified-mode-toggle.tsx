"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Accessibility } from "lucide-react";
import { toggleSimplifiedModeAction } from "@/lib/admin/profile-actions";

export function SimplifiedModeToggle({
  userId,
  initialValue,
}: {
  userId: string;
  initialValue: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    startTransition(async () => {
      const res = await toggleSimplifiedModeAction(userId, next);
      if (!res.ok) {
        setEnabled(!next); // revert
        toast.error(res.error);
        return;
      }
      toast.success(next ? "Modo simplificado activado" : "Modo estándar restaurado");
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        enabled
          ? "border-amber-500/30 bg-amber-500/[0.06]"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${enabled ? "bg-amber-500/15 text-amber-300" : "bg-muted text-muted-foreground"}`}>
          <Accessibility className="size-5" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            Ruta académica simplificada
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Para adultos mayores u alumnos con dificultad digital. Muestra solo
            <strong> intro · enseñanza · impartición</strong>. Oculta tarea,
            evaluación y quiz. El módulo se considera completado con las 3 secciones.
          </p>
          <button
            type="button"
            onClick={onToggle}
            disabled={pending}
            className={`mt-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              enabled
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "border border-border text-foreground hover:bg-muted"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {pending && <Loader2 className="size-3 animate-spin" />}
            {enabled ? "✓ Modo simplificado ACTIVO — click para desactivar" : "Activar modo simplificado"}
          </button>
        </div>
      </div>
    </div>
  );
}
