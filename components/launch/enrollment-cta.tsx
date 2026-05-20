"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentGateDialog } from "@/components/launch/enrollment-gate-dialog";
import { isEnrollmentOpen } from "@/lib/launch/config";

type Props = {
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: ReactNode;
};

/**
 * CTA gateado por la fecha de apertura de inscripciones.
 *
 * Si las inscripciones están abiertas → renderiza un `<DapButton>` que
 * navega al `href`.
 * Si están cerradas → renderiza un `<DapButton>` que abre el
 * `<EnrollmentGateDialog>` con el mensaje "Inscripciones abren el…".
 *
 * La decisión se toma en cada render con `isEnrollmentOpen()` — cuando
 * llegue la fecha, todos los CTAs vuelven a funcionar solos sin redeploy.
 */
export function EnrollmentCTA({
  href = "/suscribirme",
  size = "md",
  variant = "primary",
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
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
