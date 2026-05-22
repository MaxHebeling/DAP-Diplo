"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

/**
 * Sección "Multiplicación y expansión" — escenario interactivo:
 *
 *   • Backdrop de anillos guía + grilla de puntos sutil.
 *   • Líneas centro → ring1 → ring2 que se "dibujan" según el scroll
 *     (pathLength), no en mount.
 *   • Partículas de energía continuas que viajan por cada línea (SVG
 *     animateMotion).
 *   • Nodos con filtro Gaussian glow real + pulso individual.
 *   • Sonar/ondas concéntricas saliendo del centro como radar.
 *   • Nodo central con halo doble + brillo rotatorio.
 *   • Parallax sutil con el mouse en todo el SVG (perspectiva 3D).
 *   • Stats con count-up animado al entrar en viewport.
 */
export function PromoNetwork() {
  const center = { x: 50, y: 50 };
  const ring1 = ringPositions(center, 12, 18);
  const ring2 = ringPositions(center, 24, 36);

  // --- Parallax con mouse ---------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotX = useSpring(useTransform(my, (v) => (v - 0.5) * -8), {
    stiffness: 60,
    damping: 14,
  });
  const rotY = useSpring(useTransform(mx, (v) => (v - 0.5) * 12), {
    stiffness: 60,
    damping: 14,
  });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }
  function handleMouseLeave() {
    animate(mx, 0.5, { duration: 0.8, ease: "easeOut" });
    animate(my, 0.5, { duration: 0.8, ease: "easeOut" });
  }

  // --- Viewport reveal --------------------------------------------------
  // El gráfico hace "ignition" al entrar en viewport: las líneas se dibujan
  // con stroke-dashoffset, los nodos aparecen, las partículas empiezan a fluir.
  const sceneInView = useInView(containerRef, { once: true, margin: "-15%" });

  return (
    <section className="relative overflow-hidden px-6 py-28 sm:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_50%,rgba(36,30,114,0.32),transparent_65%)]"
      />

      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.42em] text-brand-coral">
            Multiplicación y expansión
          </p>
          <h2 className="mt-4 font-grotesk text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent">
              Mientras más personas formes,
            </span>
            <br />
            <span className="bg-gradient-to-r from-brand-violet to-brand-coral bg-clip-text text-transparent">
              más acceso generas.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-inter text-base leading-relaxed text-text-secondary">
            Cada persona que se forma contigo abre puertas para más.
            La red crece, los territorios se transforman.
          </p>
        </motion.div>

        {/* Gráfico de red interactivo */}
        <motion.div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            perspective: 1200,
            transformStyle: "preserve-3d",
          }}
          className="relative mx-auto mt-16 aspect-square w-full max-w-[640px]"
        >
          {/* Glow central */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(40%_40%_at_50%_50%,rgba(123,97,255,0.45),transparent_70%)]"
          />

          <motion.div
            style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
            className="size-full"
          >
            <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
              <defs>
                {/* gradientUnits=userSpaceOnUse evita que las líneas axis-aligned
                    pierdan el gradient por bbox cero en una dimensión. */}
                <linearGradient
                  id="net-line"
                  gradientUnits="userSpaceOnUse"
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="32"
                >
                  <stop offset="0%" stopColor="#A28BFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#7B61FF" stopOpacity="0.45" />
                </linearGradient>
                <linearGradient
                  id="net-line-far"
                  gradientUnits="userSpaceOnUse"
                  x1="50"
                  y1="32"
                  x2="50"
                  y2="14"
                >
                  <stop offset="0%" stopColor="#FF8AA0" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.18" />
                </linearGradient>

                <radialGradient id="net-node">
                  <stop offset="0%" stopColor="#F8FAFC" stopOpacity="1" />
                  <stop offset="40%" stopColor="#A28BFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="net-node-coral">
                  <stop offset="0%" stopColor="#F8FAFC" stopOpacity="1" />
                  <stop offset="40%" stopColor="#FF8AA0" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="net-core">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <stop offset="35%" stopColor="#C9B8FF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
                </radialGradient>

                {/* Glow Gaussian real para los nodos */}
                <filter id="soft-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="0.6" />
                </filter>
                <filter id="hard-glow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="1.4" />
                </filter>
              </defs>

              {/* Anillos guía sutiles */}
              {[18, 27, 36].map((r, i) => (
                <circle
                  key={`guide-${i}`}
                  cx={center.x}
                  cy={center.y}
                  r={r}
                  fill="none"
                  stroke="#A28BFF"
                  strokeOpacity={0.08}
                  strokeWidth="0.08"
                  strokeDasharray="0.4 0.6"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Sonar / radar — 3 ondas expandiéndose desde el centro */}
              {[0, 1.4, 2.8].map((delay, i) => (
                <circle
                  key={`sonar-${i}`}
                  cx={center.x}
                  cy={center.y}
                  r="3"
                  fill="none"
                  stroke="#7B61FF"
                  strokeWidth="0.18"
                  vectorEffect="non-scaling-stroke"
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    values="3;38"
                    dur="4.2s"
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.7;0"
                    dur="4.2s"
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}

              {/* Líneas centro → ring1 — draw-in al entrar en viewport */}
              {ring1.map((p, i) => {
                const len = lineLength(center, p);
                return (
                  <line
                    key={`r1-${i}`}
                    x1={center.x}
                    y1={center.y}
                    x2={p.x}
                    y2={p.y}
                    stroke="url(#net-line)"
                    strokeWidth="0.32"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      strokeDasharray: len,
                      strokeDashoffset: sceneInView ? 0 : len,
                      opacity: sceneInView ? 1 : 0,
                      transition: `stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) ${
                        0.05 * i
                      }s, opacity 0.5s ease-out ${0.05 * i}s`,
                    }}
                  />
                );
              })}

              {/* Líneas ring1 → ring2 */}
              {ring2.map((p, i) => {
                const parent = ring1[Math.floor(i / 3) % ring1.length];
                const len = lineLength(parent, p);
                return (
                  <line
                    key={`r2-${i}`}
                    x1={parent.x}
                    y1={parent.y}
                    x2={p.x}
                    y2={p.y}
                    stroke="url(#net-line-far)"
                    strokeWidth="0.22"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      strokeDasharray: len,
                      strokeDashoffset: sceneInView ? 0 : len,
                      opacity: sceneInView ? 1 : 0,
                      transition: `stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1) ${
                        0.6 + 0.02 * i
                      }s, opacity 0.4s ease-out ${0.6 + 0.02 * i}s`,
                    }}
                  />
                );
              })}

              {/* Partículas de energía viajando del centro hacia ring1 */}
              {ring1.map((p, i) => {
                const pathId = `flow1-${i}`;
                return (
                  <g key={pathId}>
                    <path
                      id={pathId}
                      d={`M ${center.x} ${center.y} L ${p.x} ${p.y}`}
                      fill="none"
                      stroke="none"
                    />
                    <circle
                      r="0.55"
                      fill="#F8FAFC"
                      filter="url(#soft-glow)"
                      opacity="0"
                    >
                      <animate
                        attributeName="opacity"
                        values="0;1;1;0"
                        keyTimes="0;0.1;0.9;1"
                        dur="2.4s"
                        begin={`${(i % 12) * 0.18 + 1}s`}
                        repeatCount="indefinite"
                      />
                      <animateMotion
                        dur="2.4s"
                        begin={`${(i % 12) * 0.18 + 1}s`}
                        repeatCount="indefinite"
                        rotate="auto"
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </circle>
                  </g>
                );
              })}

              {/* Partículas ring1 → ring2 (segunda fase, más densa) */}
              {ring2.map((p, i) => {
                const parent = ring1[Math.floor(i / 3) % ring1.length];
                const pathId = `flow2-${i}`;
                return (
                  <g key={pathId}>
                    <path
                      id={pathId}
                      d={`M ${parent.x} ${parent.y} L ${p.x} ${p.y}`}
                      fill="none"
                      stroke="none"
                    />
                    <circle
                      r="0.35"
                      fill="#FF8AA0"
                      filter="url(#soft-glow)"
                      opacity="0"
                    >
                      <animate
                        attributeName="opacity"
                        values="0;0.9;0.9;0"
                        keyTimes="0;0.1;0.9;1"
                        dur="3s"
                        begin={`${(i % 18) * 0.16 + 2.4}s`}
                        repeatCount="indefinite"
                      />
                      <animateMotion
                        dur="3s"
                        begin={`${(i % 18) * 0.16 + 2.4}s`}
                        repeatCount="indefinite"
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </circle>
                  </g>
                );
              })}

              {/* Nodos ring 2 */}
              {ring2.map((p, i) => (
                <g key={`n2-${i}`}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="0.9"
                    fill="url(#net-node-coral)"
                    filter="url(#hard-glow)"
                    opacity="0.4"
                  />
                  <circle cx={p.x} cy={p.y} r="0.4" fill="#FF8AA0">
                    <animate
                      attributeName="r"
                      values="0.3;0.55;0.3"
                      dur={`${3 + (i % 3)}s`}
                      begin={`${i * 0.06}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}

              {/* Nodos ring 1 */}
              {ring1.map((p, i) => (
                <g key={`n1-${i}`}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="1.6"
                    fill="url(#net-node)"
                    filter="url(#hard-glow)"
                    opacity="0.55"
                  />
                  <circle cx={p.x} cy={p.y} r="0.75" fill="#F8FAFC">
                    <animate
                      attributeName="r"
                      values="0.6;1.0;0.6"
                      dur={`${2.4 + (i % 3) * 0.4}s`}
                      begin={`${i * 0.1}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              ))}

              {/* Nodo central (Tú) — halo + brillo doble + pulso */}
              <circle
                cx={center.x}
                cy={center.y}
                r="6"
                fill="url(#net-core)"
                filter="url(#hard-glow)"
                opacity="0.65"
              >
                <animate
                  attributeName="r"
                  values="5;7;5"
                  dur="3.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={center.x}
                cy={center.y}
                r="2.6"
                fill="url(#net-node)"
              >
                <animate
                  attributeName="r"
                  values="2.4;3.2;2.4"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={center.x} cy={center.y} r="1.2" fill="#FFFFFF" />
            </svg>
          </motion.div>

          {/* Etiqueta */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[64px] text-center">
            <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-white/80">
              Tú
            </p>
          </div>

        </motion.div>

        {/* Stats con count-up */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] sm:mt-14"
        >
          <Stat to={1} label="Tu liderazgo" />
          <Stat to={12} label="Personas formadas" />
          <Stat to={"∞"} label="Generaciones impactadas" />
        </motion.div>
      </div>
    </section>
  );
}

function Stat({
  to,
  label,
}: {
  to: number | "∞";
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const value = useMotionValue(0);
  const [display, setDisplay] = useState<string>("0");

  useEffect(() => {
    if (!inView) return;
    if (to === "∞") {
      setDisplay("∞");
      return;
    }
    const controls = animate(value, to, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = value.on("change", (v) => setDisplay(String(Math.round(v))));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, to, value]);

  return (
    <div
      ref={ref}
      className="relative bg-[#070C20] px-6 py-7 text-center"
    >
      {/* Glow underneath number when in view */}
      {inView && to !== "∞" && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1.4, delay: 0.2 }}
          className="pointer-events-none absolute inset-x-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.45),transparent_70%)] blur-md"
        />
      )}
      <p className="relative font-grotesk text-4xl font-bold text-text-primary sm:text-5xl">
        {display}
      </p>
      <p className="relative mt-1 font-inter text-[10px] uppercase tracking-[0.32em] text-text-tertiary">
        {label}
      </p>
    </div>
  );
}

function ringPositions(
  center: { x: number; y: number },
  count: number,
  radius: number,
): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    // Redondeo para evitar mismatch de hidratación SSR vs cliente por
    // precisión flotante de Math.cos/Math.sin.
    return {
      x: Number((center.x + Math.cos(angle) * radius).toFixed(2)),
      y: Number((center.y + Math.sin(angle) * radius).toFixed(2)),
    };
  });
}

function lineLength(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
