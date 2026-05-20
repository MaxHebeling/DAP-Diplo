"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { EnrollmentGateDialog } from "@/components/launch/enrollment-gate-dialog";
import { isEnrollmentOpen } from "@/lib/launch/config";

type Props = {
  href?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Variante de EnrollmentCTA para los CTAs que usan el `<Button>` base
 * (no `DapButton`) con estilo custom — específicamente la card final
 * de cada página /fases/[slug] que tiene fondo coral.
 */
export function EnrollmentCTAPhase({ href = "/suscribirme", className, children }: Props) {
  const [open, setOpen] = useState(false);
  const enrollmentOpen = isEnrollmentOpen();

  if (enrollmentOpen) {
    return (
      <Button size="lg" className={className} render={<Link href={href} />}>
        {children}
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <EnrollmentGateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
