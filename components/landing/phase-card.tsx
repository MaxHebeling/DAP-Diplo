"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import { cn } from "@/lib/utils";

type PhaseCardProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

// Cuánto se desplaza el card hacia el cursor (en px). Sutil.
const MAGNETIC_STRENGTH = 12;

export function PhaseCard({ href, className, children }: PhaseCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 25 });
  const springY = useSpring(y, { stiffness: 200, damping: 25 });

  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    // Cursor relativo al centro del card (-0.5..0.5)
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(px * MAGNETIC_STRENGTH);
    y.set(py * MAGNETIC_STRENGTH);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
    setHovering(false);
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseEnter={() => setHovering(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // motion.create no aplica a Link — uso style + motion values en wrapper interno.
      className={cn(
        "group relative block transition-transform [transform-style:preserve-3d]",
        // En touch devices (sin hover real), desactivamos el magnetic.
        "max-[768px]:[--motion-disable:1]",
        className,
      )}
    >
      <motion.div
        style={{ x: springX, y: springY }}
        className={cn(
          "relative flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300",
          hovering &&
            "border-brand-violet/40 shadow-glow-violet ring-1 ring-brand-violet/20",
        )}
      >
        {children}
      </motion.div>
    </Link>
  );
}
