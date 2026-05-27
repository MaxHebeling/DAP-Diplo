"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Hero cinematográfico: foto futurista de ciudad + red neuronal con
 * efecto Ken Burns (zoom lento) + parallax sutil al scroll + color
 * grade que pulsa + vignette + gradient inferior al negro para fundir
 * la imagen con la siguiente sección. Sobre la imagen: logo + headline
 * + neural lines + partículas.
 */
export function PromoHero() {
  const t = useTranslations("PastoresTeam");
  return (
    <section className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-6">
      {/* Imagen de fondo con Ken Burns */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 origin-center animate-[promo-kenburns_28s_ease-in-out_infinite_alternate]"
      >
        <Image
          src="/promo-pastores-hero.jpg"
          alt=""
          fill
          priority
          quality={88}
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Vignette + color grade pulsante (violet/coral breathing) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] animate-[promo-grade_9s_ease-in-out_infinite] [background:radial-gradient(120%_85%_at_50%_50%,rgba(4,8,26,0.38)_0%,rgba(4,8,26,0.62)_55%,rgba(4,8,26,0.95)_100%),radial-gradient(60%_45%_at_50%_55%,rgba(123,97,255,0.22),transparent_60%),radial-gradient(45%_35%_at_50%_50%,rgba(255,77,109,0.18),transparent_65%)]"
      />

      {/* Halo concentrado detrás del headline para máxima legibilidad */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-[2] h-[65%] -translate-y-1/2 [background:radial-gradient(55%_50%_at_50%_50%,rgba(4,8,26,0.78),rgba(4,8,26,0.35)_55%,transparent_80%)]"
      />

      {/* Fade inferior al negro — funde con la siguiente sección */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-1/3 bg-gradient-to-b from-transparent via-[#04081A]/70 to-[#04081A]"
      />

      {/* Sweep horizontal sutil tipo láser */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-[3] h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent"
      />

      {/* Red neuronal animada (SVG) — encima de la imagen */}
      <NeuralLines />

      {/* Partículas suaves */}
      <Particles />

      {/* Keyframes Ken Burns + breathing grade */}
      <style>{`
        @keyframes promo-kenburns {
          0%   { transform: scale(1.05) translate3d(0, 0, 0); }
          100% { transform: scale(1.14) translate3d(-1.5%, -1%, 0); }
        }
        @keyframes promo-grade {
          0%, 100% { opacity: 0.92; }
          50%      { opacity: 1; }
        }
      `}</style>

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-10"
        >
          {/* Glow detrás del logo */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 scale-150 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.55),transparent_60%)] blur-2xl"
          />
          <Image
            src="/dap-logo-white.png"
            alt="DAP"
            width={180}
            height={180}
            priority
            className="h-auto w-[120px] sm:w-[160px]"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="font-inter text-[11px] font-semibold uppercase tracking-[0.42em] text-brand-coral"
        >
          {t("hero.eyebrow")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 font-grotesk text-[42px] font-bold leading-[1.05] tracking-tight [text-shadow:0_2px_24px_rgba(4,8,26,0.85),0_0_60px_rgba(4,8,26,0.6)] sm:text-6xl md:text-7xl"
        >
          <span className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent">
            {t("hero.headlineTop")}
          </span>
          <br />
          <span className="bg-gradient-to-br from-brand-violet via-[#A28BFF] to-brand-coral bg-clip-text text-transparent">
            {t("hero.headlineBottom")}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-7 max-w-xl font-inter text-base leading-relaxed text-text-secondary [text-shadow:0_2px_16px_rgba(4,8,26,0.85)] sm:text-lg"
        >
          {t("hero.subheadlineLead")}{" "}
          <span className="text-text-primary">{t("hero.subheadlineEmphasis")}</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.95 }}
          className="mt-14 flex flex-col items-center gap-2"
        >
          <span className="font-inter text-[10px] uppercase tracking-[0.32em] text-text-tertiary">
            {t("hero.scrollCue")}
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="text-brand-violet"
          >
            <ChevronDown className="size-5" strokeWidth={1.6} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Red neuronal de fondo: 8 nodos conectados con líneas sutiles que
 * pulsan en opacidad. Posicionados para enmarcar el contenido sin
 * estorbar.
 */
function NeuralLines() {
  const nodes = [
    { x: 12, y: 18 },
    { x: 88, y: 22 },
    { x: 8, y: 72 },
    { x: 92, y: 78 },
    { x: 28, y: 52 },
    { x: 72, y: 48 },
    { x: 50, y: 12 },
    { x: 50, y: 88 },
  ];
  const links: Array<[number, number]> = [
    [0, 4], [1, 5], [2, 4], [3, 5], [4, 5], [6, 0], [6, 1], [7, 2], [7, 3], [4, 6], [5, 7],
  ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[3] size-full opacity-[0.55] mix-blend-screen"
    >
      <defs>
        <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7B61FF" stopOpacity="0.0" />
          <stop offset="50%" stopColor="#7B61FF" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.0" />
        </linearGradient>
        <radialGradient id="node">
          <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {links.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="url(#line)"
          strokeWidth="0.12"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.25;0.85;0.25"
            dur={`${4 + (i % 3)}s`}
            begin={`${(i % 5) * 0.4}s`}
            repeatCount="indefinite"
          />
        </line>
      ))}

      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="0.6"
          fill="url(#node)"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="r"
            values="0.5;1.1;0.5"
            dur={`${3 + (i % 2)}s`}
            begin={`${i * 0.3}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

/**
 * Partículas decorativas — 18 puntitos con animación CSS-only.
 */
function Particles() {
  const items = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[4] overflow-hidden"
    >
      {items.map((i) => {
        const left = (i * 53) % 100;
        const top = (i * 37 + 11) % 100;
        const delay = (i % 7) * 0.6;
        const dur = 8 + (i % 5);
        return (
          <span
            key={i}
            className="absolute size-[3px] rounded-full bg-white/40 [animation:promo-particle_var(--d)_ease-in-out_infinite] [animation-delay:var(--dl)]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              ["--d" as string]: `${dur}s`,
              ["--dl" as string]: `${delay}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes promo-particle {
          0%, 100% { opacity: 0; transform: translate3d(0, 0, 0) scale(0.6); }
          50% { opacity: 0.6; transform: translate3d(0, -16px, 0) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
