"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/**
 * Cursor custom: círculo outline que sigue al mouse y crece sobre
 * elementos interactivos (button, a, [role=button], inputs, [data-cursor]).
 *
 * - Solo en desktop con pointer fino (no mobile/táctil).
 * - Respeta prefers-reduced-motion (no monta).
 * - El cursor nativo NO se oculta: convivimos para no romper a quien
 *   tenga inputs / focus visible / lectores de pantalla.
 *
 * Para forzar el estado "hover" desde un elemento no estándar:
 *   <div data-cursor="hover" />
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Spring suave para que el cursor "siga" sin sentirse atado al mouse.
  const springX = useSpring(x, { stiffness: 380, damping: 28, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 380, damping: 28, mass: 0.4 });

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)")
      .matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    if (!canHover || reduceMotion) return;

    setEnabled(true);

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    const isInteractive = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          "a, button, [role='button'], input, textarea, select, label, [data-cursor='hover']",
        ),
      );
    };

    const onOver = (e: MouseEvent) => {
      if (isInteractive(e.target)) setHovering(true);
    };
    const onOut = (e: MouseEvent) => {
      // Solo apaga si efectivamente saliste del interactivo.
      if (!isInteractive(e.relatedTarget)) setHovering(false);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      style={{
        x: springX,
        y: springY,
        // Centrar en el cursor (el círculo es 32x32 cuando idle).
        translateX: "-50%",
        translateY: "-50%",
      }}
      animate={{
        width: hovering ? 56 : 32,
        height: hovering ? 56 : 32,
        borderColor: hovering ? "#FF4D6D" : "#7B61FF",
        backgroundColor: hovering
          ? "rgba(255,77,109,0.08)"
          : "rgba(123,97,255,0.04)",
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full border-2 mix-blend-screen"
    />
  );
}
