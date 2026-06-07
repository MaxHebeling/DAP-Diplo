"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Renderiza un número que cuenta de 0 al valor objetivo cuando entra al
 * viewport. Progressive enhancement:
 *
 *   - SSR + primer paint: valor estático (9, 72, etc) — el usuario lo ve
 *     correcto desde el primer frame.
 *   - Después del mount cliente: si el componente entra al viewport y el
 *     usuario no tiene prefers-reduced-motion, anima de 0 → valor.
 *
 * Antes el render inicial mostraba "0" (useMotionValue(0) en SSR), y si
 * `useInView` nunca disparaba (viewport no visible, snapshot tomado antes
 * de animación, JS deshabilitado) el número quedaba en 0 forever. Bug
 * detectado en E2E jun-2026.
 */
export function AnimatedNumber({
  value,
  prefix,
  suffix,
  duration = 1.8,
  viewportAmount = 0.5,
  className,
}: AnimatedNumberProps) {
  const [mounted, setMounted] = useState(false);
  // setState en effect intencional: necesitamos diferenciar SSR/primer
  // paint (mounted=false → valor estático) del momento cliente (mounted=true
  // → componente animado). Sin esto el SSR renderiza "0".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <StaticNumber value={value} prefix={prefix} suffix={suffix} className={className} />;
  }

  return (
    <AnimatedImpl
      value={value}
      prefix={prefix}
      suffix={suffix}
      duration={duration}
      viewportAmount={viewportAmount}
      className={className}
    />
  );
}

function StaticNumber({
  value,
  prefix,
  suffix,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {prefix}
      {value.toLocaleString("es")}
      {suffix}
    </span>
  );
}

function AnimatedImpl({
  value,
  prefix,
  suffix,
  duration,
  viewportAmount,
  className,
}: Required<Omit<AnimatedNumberProps, "prefix" | "suffix" | "className">> & {
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: viewportAmount });
  // Arrancamos en value (no 0) para que cualquier paint pre-animación
  // muestre el valor correcto. Cuando inView dispara, reseteamos a 0
  // y animamos hasta value.
  const count = useMotionValue(value);
  const rounded = useTransform(count, (v) =>
    Math.round(v).toLocaleString("es"),
  );

  useEffect(() => {
    if (!inView) return;
    count.set(0);
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
