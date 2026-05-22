"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { EnrollmentGateDialog } from "@/components/launch/enrollment-gate-dialog";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { isEnrollmentOpen } from "@/lib/launch/config";

type Props = {
  href?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Variante de EnrollmentCTA para los CTAs con `<Button>` custom
 * (ej. card final de /fases/[slug]). Mismo comportamiento que
 * EnrollmentCTA: si hay OnboardingProvider → modal de onboarding,
 * sino fallback legacy.
 */
export function EnrollmentCTAPhase({ href = "/suscribirme", className, children }: Props) {
  const [open, setOpen] = useState(false);
  const onboarding = useOnboarding();

  if (onboarding) {
    return (
      <Button size="lg" className={className} onClick={onboarding.open}>
        {children}
      </Button>
    );
  }

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
