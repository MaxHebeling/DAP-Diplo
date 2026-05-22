"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentGateDialog } from "@/components/launch/enrollment-gate-dialog";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { isEnrollmentOpen } from "@/lib/launch/config";

type Props = {
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: ReactNode;
};

/**
 * CTA principal de inscripción. Comportamiento por contexto:
 *
 *  1. Si está dentro de un <OnboardingProvider> (zona pública) →
 *     abre el modal de onboarding (país → cuenta → Stripe).
 *  2. Si NO hay provider (zona logueada como /dashboard) →
 *     cae al comportamiento legacy: link directo a /suscribirme
 *     si el gate está abierto, o popup de fechas si está cerrado.
 *
 * Esto deja el dashboard de alumno (donde ya hay user + país)
 * funcionando como antes sin requerir el onboarding modal.
 */
export function EnrollmentCTA({
  href = "/suscribirme",
  size = "md",
  variant = "primary",
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const onboarding = useOnboarding();

  // Si estamos en zona pública (provider presente) → modal de onboarding.
  if (onboarding) {
    return (
      <DapButton
        size={size}
        variant={variant}
        className={className}
        onClick={onboarding.open}
      >
        {children}
      </DapButton>
    );
  }

  // Fallback legacy para zonas sin provider (ej /dashboard).
  const enrollmentOpen = isEnrollmentOpen();
  if (enrollmentOpen) {
    return (
      <DapButton
        render={<Link href={href} />}
        size={size}
        variant={variant}
        className={className}
      >
        {children}
      </DapButton>
    );
  }

  return (
    <>
      <DapButton
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </DapButton>
      <EnrollmentGateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
