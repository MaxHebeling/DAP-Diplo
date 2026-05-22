"use client";

import { type ReactNode } from "react";

import { DapButton } from "@/components/ui-dap/button";
import { useOnboarding } from "@/components/onboarding/onboarding-provider";

type Props = {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: ReactNode;
};

/**
 * Drop-in replacement de EnrollmentCTA: abre el modal de onboarding
 * (país → cuenta → Stripe) en vez del popup del launch gate o de
 * navegar directo a /suscribirme.
 */
export function OnboardingCTA({
  size = "md",
  variant = "primary",
  className,
  children,
}: Props) {
  const onboarding = useOnboarding();

  return (
    <DapButton
      size={size}
      variant={variant}
      className={className}
      onClick={() => onboarding?.open()}
    >
      {children}
    </DapButton>
  );
}
