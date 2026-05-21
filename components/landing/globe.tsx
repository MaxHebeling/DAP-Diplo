"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";
import type { VantaEffect } from "vanta/dist/vanta.globe.min";

type GlobeSize = "sm" | "md" | "lg";
type GlobeIntensity = "subtle" | "medium" | "cosmic";

type GlobeProps = {
  size?: GlobeSize;
  intensity?: GlobeIntensity;
  className?: string;
  /** Color values in 0xRRGGBB form. Override paleta DAP defaults. */
  color?: number;
  color2?: number;
  backgroundColor?: number;
};

const SIZE_CLASS: Record<GlobeSize, string> = {
  sm: "w-[240px] h-[240px]",
  md: "w-[400px] h-[400px]",
  lg: "w-[600px] h-[600px]",
};

const INTENSITY_SIZE: Record<GlobeIntensity, number> = {
  subtle: 0.7,
  medium: 1.0,
  cosmic: 1.5,
};

export function Globe({
  size = "md",
  intensity = "medium",
  className,
  color = 0x7b61ff, // brand-violet
  color2 = 0xff4d6d, // brand-coral
  backgroundColor = 0x07142b, // surface-base
}: GlobeProps) {
  const vantaRef = useRef<HTMLDivElement | null>(null);
  const [effect, setEffect] = useState<VantaEffect | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const el = vantaRef.current;
    if (!el || effect) return;

    let cancelled = false;
    let localEffect: VantaEffect | null = null;

    (async () => {
      const mod = await import("vanta/dist/vanta.globe.min");
      const GLOBE = mod.default;
      if (cancelled || !vantaRef.current) return;

      localEffect = GLOBE({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1.0,
        scaleMobile: 0.8,
        color,
        color2,
        backgroundColor,
        size: INTENSITY_SIZE[intensity],
      });
      if (cancelled) {
        localEffect?.destroy();
        return;
      }
      setEffect(localEffect);
    })().catch((err) => {
      console.error("[Globe] vanta init failed", err);
    });

    return () => {
      cancelled = true;
      if (localEffect) localEffect.destroy();
      setEffect(null);
    };
    // We intentionally do not depend on `effect` (would cause re-init loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity, color, color2, backgroundColor]);

  return (
    <div
      ref={vantaRef}
      aria-hidden
      className={cn(
        "overflow-hidden rounded-full",
        SIZE_CLASS[size],
        className,
      )}
    />
  );
}
