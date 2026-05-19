"use client";

import { useEffect, useMemo, useState } from "react";
import { Particles, ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, ISourceOptions } from "@tsparticles/engine";

type Intensity = "subtle" | "medium" | "cosmic";

type HeroParticlesProps = {
  intensity?: Intensity;
  className?: string;
};

type Density = {
  particles: number;
  lineOpacity: number;
  size: { min: number; max: number };
};

const DESKTOP_DENSITY: Record<Intensity, Density> = {
  subtle: { particles: 40, lineOpacity: 0.08, size: { min: 1, max: 2 } },
  medium: { particles: 80, lineOpacity: 0.15, size: { min: 1, max: 3 } },
  cosmic: { particles: 120, lineOpacity: 0.18, size: { min: 1, max: 3 } },
};

const MOBILE_PARTICLES = 40;
const MOBILE_LINE_OPACITY = 0.12;

// Module-level init must be stable across the app lifecycle
// (ParticlesProvider throws if the callback identity changes).
const initEngine = async (engine: Engine) => {
  await loadSlim(engine);
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export function HeroParticles({
  intensity = "medium",
  className,
}: HeroParticlesProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const options = useMemo<ISourceOptions>(() => {
    const d = DESKTOP_DENSITY[intensity];
    const particleCount = isMobile ? MOBILE_PARTICLES : d.particles;
    const lineOpacity = isMobile ? MOBILE_LINE_OPACITY : d.lineOpacity;

    const baseColor =
      intensity === "cosmic"
        ? ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#7B61FF", "#FF4D6D"]
        : "#FFFFFF";

    return {
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      background: { color: "transparent" },
      pauseOnBlur: true,
      pauseOnOutsideViewport: true,
      particles: {
        number: {
          value: particleCount,
          density: { enable: true, width: 1200, height: 800 },
        },
        color: { value: baseColor },
        opacity: { value: { min: 0.4, max: 1 } },
        size: { value: d.size },
        move: {
          enable: !reducedMotion,
          speed: reducedMotion ? 0 : 0.3,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "bounce" },
        },
        links: {
          enable: true,
          color: "#7B61FF",
          distance: 140,
          opacity: lineOpacity,
          width: 1,
        },
      },
      interactivity: {
        events: {
          onHover: {
            enable: !reducedMotion && !isMobile,
            mode: "repulse",
          },
          onClick: { enable: false },
        },
        modes: {
          repulse: { distance: 150, duration: 0.4 },
        },
      },
    };
  }, [intensity, isMobile, reducedMotion]);

  return (
    <ParticlesProvider init={initEngine}>
      <Particles
        id={`hero-particles-${intensity}`}
        options={options}
        className={className ?? "absolute inset-0"}
      />
    </ParticlesProvider>
  );
}
