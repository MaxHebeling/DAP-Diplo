"use client";

import { motion } from "motion/react";
import { useMemo, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  /** Tilt en grados (±). 0 = sin tilt. Default 1.5°. */
  tilt?: number;
  className?: string;
};

export function Reveal({
  children,
  delay = 0,
  y = 24,
  tilt = 1.5,
  className,
}: RevealProps) {
  // Tilt aleatorio determinístico por instancia (sutil, ±tilt grados).
  // useMemo para que no cambie en re-renders.
  const initialRotate = useMemo(
    () => (tilt > 0 ? (Math.random() * 2 - 1) * tilt : 0),
    [tilt],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y, rotate: initialRotate }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
