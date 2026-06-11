"use client";

import { motion } from "motion/react";
import { useRef, useState } from "react";

type Props = {
  /** URL del video. null/undefined = muestra estado "próximamente" */
  videoSrc?: string | null;
  /** Imagen de poster opcional */
  posterSrc?: string;
  playLabel: string;
  comingSoonLabel: string;
  directorCaption: string;
};

/**
 * Frame premium para el video del UCM con glassmorphism, glow, neural
 * network accents y play button. Si no se pasa videoSrc, muestra el
 * estado "próximamente" — fácil de wirear cuando el video esté listo.
 */
export function AcademicVideoFrame({
  videoSrc,
  posterSrc,
  playLabel,
  comingSoonLabel,
  directorCaption,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  function handlePlay() {
    if (!videoSrc) return;
    setPlaying(true);
    queueMicrotask(() => videoRef.current?.play().catch(() => undefined));
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="group relative aspect-video w-full"
    >
      {/* Glow externo violeta — pulsa suavemente */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(123,97,255,0.35)_0%,rgba(36,30,114,0.18)_45%,transparent_75%)] blur-2xl transition-opacity duration-700 group-hover:opacity-100 opacity-75"
      />

      {/* Marco glassmorphism */}
      <div className="relative h-full w-full overflow-hidden rounded-[20px] border border-white/[0.12] bg-gradient-to-br from-[#0F1A38]/90 via-[#10193A]/85 to-[#070F25]/95 shadow-[0_30px_80px_-20px_rgba(7,20,43,0.9)] backdrop-blur-md">
        {/* Borde gradiente interno (separador conic) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[20px] [background:linear-gradient(135deg,rgba(123,97,255,0.45),transparent_30%,transparent_70%,rgba(255,77,109,0.35))] p-[1px]"
        >
          <div className="h-full w-full rounded-[19px] bg-transparent" />
        </div>

        {/* Neural network background (SVG inline) */}
        <NeuralNetworkAccents />

        {/* Holographic particles */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, rgba(123,97,255,0.30) 0, transparent 4%), radial-gradient(circle at 78% 70%, rgba(255,77,109,0.22) 0, transparent 5%), radial-gradient(circle at 50% 88%, rgba(248,250,252,0.10) 0, transparent 3%)",
          }}
        />

        {/* Poster + play, o video reproduciéndose */}
        {videoSrc && playing ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            controls
            playsInline
            className="relative z-10 h-full w-full object-cover"
          />
        ) : (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
            {posterSrc && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterSrc}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    videoSrc ? "opacity-80 group-hover:opacity-95" : "opacity-50"
                  }`}
                />
                {/* Scrim oscuro inferior para legibilidad del caption */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#07142B] via-[#07142B]/70 to-transparent"
                />
              </>
            )}

            <button
              type="button"
              onClick={handlePlay}
              disabled={!videoSrc}
              aria-label={videoSrc ? playLabel : comingSoonLabel}
              className="group/play relative flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.06] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 sm:h-24 sm:w-24"
            >
              {/* Glow del botón */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7B61FF] to-[#FF4D6D] opacity-90 blur-md transition-opacity group-hover/play:opacity-100"
              />
              {/* Disco frontal */}
              <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#7B61FF] via-[#5B47E0] to-[#FF4D6D] shadow-[0_0_40px_rgba(123,97,255,0.6)]">
                {/* Play icon */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="ml-1 h-8 w-8 sm:h-10 sm:w-10"
                  aria-hidden
                >
                  <path
                    d="M8 5.5v13l11-6.5L8 5.5z"
                    fill="#F8FAFC"
                    stroke="#F8FAFC"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            {!videoSrc && (
              <span className="mt-6 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 font-inter text-[11px] font-medium uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
                {comingSoonLabel}
              </span>
            )}

            <p className="mt-5 px-6 text-center font-inter text-sm leading-relaxed text-white/75">
              {directorCaption}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/** Red neural decorativa: nodos + líneas con sutil shimmer. */
function NeuralNetworkAccents() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 225"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="neuralLine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7B61FF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="neuralNode">
          <stop offset="0%" stopColor="#F8FAFC" stopOpacity="1" />
          <stop offset="100%" stopColor="#7B61FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Líneas (conexiones) */}
      <g stroke="url(#neuralLine)" strokeWidth="0.6" fill="none">
        <line x1="40" y1="40" x2="170" y2="90">
          <animate
            attributeName="stroke-opacity"
            values="0.3;0.8;0.3"
            dur="4s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="170" y1="90" x2="320" y2="50">
          <animate
            attributeName="stroke-opacity"
            values="0.4;0.9;0.4"
            dur="5s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="170" y1="90" x2="100" y2="180">
          <animate
            attributeName="stroke-opacity"
            values="0.3;0.7;0.3"
            dur="6s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="170" y1="90" x2="290" y2="170">
          <animate
            attributeName="stroke-opacity"
            values="0.4;0.85;0.4"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="320" y1="50" x2="290" y2="170">
          <animate
            attributeName="stroke-opacity"
            values="0.3;0.7;0.3"
            dur="5.5s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="100" y1="180" x2="290" y2="170">
          <animate
            attributeName="stroke-opacity"
            values="0.25;0.6;0.25"
            dur="7s"
            repeatCount="indefinite"
          />
        </line>
      </g>

      {/* Nodos */}
      {[
        { x: 40, y: 40, r: 6 },
        { x: 170, y: 90, r: 8 },
        { x: 320, y: 50, r: 6 },
        { x: 100, y: 180, r: 5 },
        { x: 290, y: 170, r: 7 },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r * 2.5} fill="url(#neuralNode)" />
          <circle cx={n.x} cy={n.y} r={n.r * 0.45} fill="#F8FAFC">
            <animate
              attributeName="opacity"
              values="0.7;1;0.7"
              dur={`${3 + i}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
}
