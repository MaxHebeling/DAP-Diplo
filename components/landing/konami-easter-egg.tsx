"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const COLORS = ["#7B61FF", "#FF4D6D", "#FFB84D", "#4DFFB8", "#FFD700"];

/**
 * Easter egg: si el usuario teclea ↑↑↓↓←→←→BA dispara una lluvia de
 * partículas + un toast pequeño "Enviado detected".
 * Cero impacto fuera del trigger.
 */
type Particle = {
  id: number;
  left: number;
  color: string;
  size: number;
  dx: number;
  dy: number;
  rotate: number;
  duration: number;
  delay: number;
};

function generateParticles(): Particle[] {
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: 50 + (Math.random() - 0.5) * 60, // 20%..80% viewport
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 10,
    dx: (Math.random() - 0.5) * 600,
    dy: -300 - Math.random() * 400,
    rotate: Math.random() * 720 - 360,
    duration: 1.6 + Math.random() * 1.2,
    delay: Math.random() * 0.3,
  }));
}

export function KonamiEasterEgg() {
  const [triggered, setTriggered] = useState(false);

  // Particles se regeneran en cada trigger. useState + effect en vez de
  // useMemo porque el React Compiler trata useMemo como puro y puede
  // descartar la memoización con valores aleatorios.
  const [particles, setParticles] = useState<Particle[]>(() =>
    generateParticles(),
  );
  useEffect(() => {
    if (triggered) setParticles(generateParticles());
  }, [triggered]);

  useEffect(() => {
    let buffer: string[] = [];
    function onKey(e: KeyboardEvent) {
      // Ignorar si está tipeando en un input/textarea
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA/.test(target.tagName)) return;

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buffer = [...buffer, key].slice(-SEQUENCE.length);
      const matched = SEQUENCE.every((k, i) => buffer[i] === k);
      if (matched) {
        buffer = [];
        setTriggered(true);
        window.setTimeout(() => setTriggered(false), 3500);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {triggered && (
        <>
          {/* Partículas */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
          >
            {particles.map((p) => (
              <motion.span
                key={p.id}
                initial={{
                  opacity: 0,
                  scale: 0.4,
                  x: 0,
                  y: 0,
                  rotate: 0,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.4, 1, 1, 0.6],
                  x: p.dx,
                  y: p.dy,
                  rotate: p.rotate,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: "easeOut",
                  times: [0, 0.2, 0.8, 1],
                }}
                style={{
                  position: "absolute",
                  bottom: "8%",
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: 2,
                  boxShadow: `0 0 12px ${p.color}80`,
                }}
              />
            ))}
          </div>

          {/* Toast */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none fixed bottom-10 left-1/2 z-[9999] -translate-x-1/2 rounded-full border border-white/[0.12] bg-surface-elevated/90 px-5 py-2.5 font-inter text-sm font-medium text-text-primary shadow-card backdrop-blur-xl"
          >
            <span className="gradient-text font-grotesk font-bold uppercase tracking-widest">
              Enviado
            </span>{" "}
            <span className="text-text-secondary">detected ✦</span>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
