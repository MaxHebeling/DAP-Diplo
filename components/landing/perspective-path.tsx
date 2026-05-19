"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

const VP_X = 720;
const VP_Y = 240;

const LANES = [-260, 60, 320, 540, 720, 900, 1120, 1380, 1700];
const CROSSES = [
  { y: 800, half: 720 },
  { y: 600, half: 460 },
  { y: 460, half: 290 },
  { y: 370, half: 188 },
  { y: 310, half: 124 },
  { y: 275, half: 84 },
  { y: 252, half: 50 },
];

export function PerspectivePath() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-surface-base" />

      {/* Vanishing point glow — pulsa al entrar en viewport */}
      <motion.div
        className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 size-[420px] rounded-full bg-brand-violet/[0.18] blur-[110px]"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 size-[260px] rounded-full bg-brand-coral/[0.12] blur-[80px]"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Horizon line: aparece como una línea que se dibuja desde el centro */}
      <motion.div
        className="absolute left-0 right-0 top-[30%] h-px bg-gradient-to-r from-transparent via-brand-violet/30 to-transparent"
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
      />

      <svg
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[70%] w-full"
      >
        <defs>
          <linearGradient id="lane-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B61FF" stopOpacity="0" />
            <stop offset="35%" stopColor="#7B61FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="cross-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Lane lines: cada una se dibuja desde el horizonte hacia el frente
            con pathLength 0→1. Stagger sutil (60ms entre lane). */}
        <g stroke="url(#lane-fade)" strokeWidth="0.8" fill="none">
          {LANES.map((endX, i) => (
            <motion.line
              key={i}
              x1={VP_X}
              y1={VP_Y}
              x2={endX}
              y2={800}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{
                duration: 1.4,
                delay: 0.3 + i * 0.06,
                ease: "easeOut",
              }}
            />
          ))}
        </g>

        {/* Cross lines: van apareciendo de las más cercanas (abajo) hacia el
            horizonte. Stagger inverso. */}
        <g
          stroke="url(#cross-fade)"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
        >
          {CROSSES.map((c, i) => (
            <motion.line
              key={i}
              x1={VP_X - c.half}
              y1={c.y}
              x2={VP_X + c.half}
              y2={c.y}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{
                duration: 0.8,
                delay: 0.8 + i * 0.1,
                ease: "easeOut",
              }}
            />
          ))}
        </g>
      </svg>

      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-surface-base to-transparent" />
    </div>
  );
}
