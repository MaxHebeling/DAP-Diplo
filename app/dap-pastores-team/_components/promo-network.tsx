"use client";

import { motion } from "motion/react";

/**
 * Sección "Multiplicación y expansión" — gráfico abstracto de nodos
 * conectados creciendo en capas, simbolizando expansión territorial.
 * Animación: las líneas se dibujan, los nodos pulsan secuencialmente.
 */
export function PromoNetwork() {
  // Estructura: nodo central (tú) → 12 satélites cercanos → 36 perimetrales.
  const center = { x: 50, y: 50 };
  const ring1 = ringPositions(center, 12, 18);
  const ring2 = ringPositions(center, 24, 36);

  return (
    <section className="relative overflow-hidden px-6 py-28 sm:py-36">
      {/* Glow de fondo de la sección */}
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

        {/* Gráfico de red */}
        <div className="relative mx-auto mt-16 aspect-square w-full max-w-[640px]">
          {/* Glow central */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(40%_40%_at_50%_50%,rgba(123,97,255,0.35),transparent_70%)]"
          />

          <svg
            viewBox="0 0 100 100"
            className="size-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="net-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7B61FF" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="net-line-far" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7B61FF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.15" />
              </linearGradient>
              <radialGradient id="net-node">
                <stop offset="0%" stopColor="#F8FAFC" stopOpacity="1" />
                <stop offset="40%" stopColor="#A28BFF" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="net-node-coral">
                <stop offset="0%" stopColor="#F8FAFC" stopOpacity="1" />
                <stop offset="40%" stopColor="#FF8AA0" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Líneas del centro al ring 1 */}
            {ring1.map((p, i) => (
              <line
                key={`r1-${i}`}
                x1={center.x}
                y1={center.y}
                x2={p.x}
                y2={p.y}
                stroke="url(#net-line)"
                strokeWidth="0.18"
                vectorEffect="non-scaling-stroke"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;0.85;0.55"
                  dur="1.4s"
                  begin={`${0.05 * i}s`}
                  fill="freeze"
                />
              </line>
            ))}

            {/* Líneas del ring 1 al ring 2 (cada ring2 conecta al ring1 más cercano) */}
            {ring2.map((p, i) => {
              const parent = ring1[Math.floor(i / 3) % ring1.length];
              return (
                <line
                  key={`r2-${i}`}
                  x1={parent.x}
                  y1={parent.y}
                  x2={p.x}
                  y2={p.y}
                  stroke="url(#net-line-far)"
                  strokeWidth="0.12"
                  vectorEffect="non-scaling-stroke"
                  opacity="0"
                >
                  <animate
                    attributeName="opacity"
                    values="0;0.6;0.35"
                    dur="1.4s"
                    begin={`${1.4 + 0.03 * i}s`}
                    fill="freeze"
                  />
                </line>
              );
            })}

            {/* Nodos ring 2 */}
            {ring2.map((p, i) => (
              <circle
                key={`n2-${i}`}
                cx={p.x}
                cy={p.y}
                r="0.5"
                fill="url(#net-node-coral)"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;1"
                  dur="0.4s"
                  begin={`${1.6 + 0.025 * i}s`}
                  fill="freeze"
                />
                <animate
                  attributeName="r"
                  values="0.4;0.9;0.5"
                  dur={`${3 + (i % 3)}s`}
                  begin={`${2 + 0.05 * i}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Nodos ring 1 */}
            {ring1.map((p, i) => (
              <circle
                key={`n1-${i}`}
                cx={p.x}
                cy={p.y}
                r="0.8"
                fill="url(#net-node)"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  values="0;1"
                  dur="0.4s"
                  begin={`${0.1 + 0.05 * i}s`}
                  fill="freeze"
                />
                <animate
                  attributeName="r"
                  values="0.7;1.4;0.8"
                  dur={`${2.5 + (i % 3)}s`}
                  begin={`${1 + 0.1 * i}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Nodo central (tú) */}
            <circle
              cx={center.x}
              cy={center.y}
              r="3"
              fill="url(#net-node)"
            >
              <animate
                attributeName="r"
                values="2.6;3.6;2.6"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={center.x}
              cy={center.y}
              r="1.3"
              fill="#F8FAFC"
            />
          </svg>

          {/* Etiquetas */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[60px] text-center">
            <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-white/80">
              Tú
            </p>
          </div>
        </div>

        {/* Stats abajo del gráfico */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] sm:mt-14"
        >
          <Stat n="1" label="Tu liderazgo" />
          <Stat n="12" label="Personas formadas" />
          <Stat n="∞" label="Generaciones impactadas" />
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-[#070C20] px-6 py-7 text-center">
      <p className="font-grotesk text-4xl font-bold text-text-primary sm:text-5xl">
        {n}
      </p>
      <p className="mt-1 font-inter text-[10px] uppercase tracking-[0.32em] text-text-tertiary">
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
