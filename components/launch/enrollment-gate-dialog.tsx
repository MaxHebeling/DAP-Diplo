"use client";

import { CalendarClock, GraduationCap } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
} from "@/lib/launch/config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Modal compartido que se muestra cuando alguien clickea un CTA de
 * inscripción antes de la fecha de apertura.
 */
export function EnrollmentGateDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-coral/10 text-brand-coral">
          <CalendarClock className="h-6 w-6" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-center font-grotesk text-lg font-bold">
            Inscripciones abren el {ENROLLMENT_OPENS_LABEL}
          </DialogTitle>
          <DialogDescription className="text-center">
            La primera convocatoria del Diplomado Apostólico Pastoral
            abre inscripciones el <strong>01 de Junio de 2026</strong>.
            Vuelve en esa fecha para postular tu admisión y asegurar
            tu lugar.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 flex items-start gap-3 rounded-lg border border-brand-violet/25 bg-brand-violet/[0.08] p-3 text-left">
          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-violet" />
          <div className="text-sm leading-relaxed text-text-secondary">
            <p className="font-semibold text-text-primary">
              Clases comienzan oficialmente
            </p>
            <p className="capitalize">{CLASSES_START_LABEL}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
