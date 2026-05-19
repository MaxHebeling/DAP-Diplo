"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "motion/react";

type AnimatedNumberProps = {
  value: number;
  /** Texto opcional antes del número (ej: "$"). */
  prefix?: string;
  /** Texto opcional después (ej: " meses", "/mes"). */
  suffix?: string;
  /** Segundos. */
  duration?: number;
  /** Cuándo dispara (porcentaje de viewport visible). */
  viewportAmount?: number;
  className?: string;
};

export function AnimatedNumber({
  value,
  prefix,
  suffix,
  duration = 1.8,
  viewportAmount = 0.5,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: viewportAmount });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    Math.round(v).toLocaleString("es"),
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, value, duration, count]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
