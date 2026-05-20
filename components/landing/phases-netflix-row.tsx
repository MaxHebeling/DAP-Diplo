"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type NetflixPhaseRow = {
  slug: string;
  order_index: number;
  title: string;
  brand_name: string | null;
  promise: string | null;
  subtitle: string | null;
  cover_image_url: string | null;
  dimension_name: string | null;
  dimension_order: number | null;
  modules_count: number;
};

const ACCENT_GRADIENTS = [
  "from-violet-600 via-fuchsia-700 to-rose-700",
  "from-pink-600 via-rose-700 to-orange-700",
  "from-indigo-700 via-purple-700 to-fuchsia-700",
  "from-rose-700 via-pink-700 to-fuchsia-800",
  "from-violet-800 via-indigo-800 to-blue-900",
  "from-amber-700 via-orange-700 to-rose-800",
  "from-emerald-700 via-teal-700 to-cyan-800",
  "from-cyan-700 via-sky-700 to-violet-800",
  "from-yellow-600 via-amber-700 to-rose-800",
];

export function PhasesNetflixRow({ phases }: { phases: NetflixPhaseRow[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  function onScroll() {
    const el = railRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 8);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  function scrollBy(dir: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth * 0.7;
    el.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {/* Flecha izquierda */}
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        aria-label="Anterior"
        className={cn(
          "absolute left-0 top-1/2 z-20 -translate-y-1/2 hidden h-20 w-12 items-center justify-center rounded-r-lg bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 md:flex",
          showLeft ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronLeft className="size-7" />
      </button>

      {/* Flecha derecha */}
      <button
        type="button"
        onClick={() => scrollBy(1)}
        aria-label="Siguiente"
        className={cn(
          "absolute right-0 top-1/2 z-20 -translate-y-1/2 hidden h-20 w-12 items-center justify-center rounded-l-lg bg-black/50 text-white backdrop-blur-sm transition-opacity hover:bg-black/70 md:flex",
          showRight ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRight className="size-7" />
      </button>

      {/* Rail con scroll horizontal + snap */}
      <div
        ref={railRef}
        onScroll={onScroll}
        className="netflix-rail relative -mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-6 pb-6 pt-4 sm:-mx-10 sm:px-10 lg:gap-4"
      >
        {phases.map((p, i) => {
          const accent = ACCENT_GRADIENTS[(p.order_index - 1) % ACCENT_GRADIENTS.length];
          const heroTitle = p.brand_name ?? p.title;
          const dimN = String(p.dimension_order ?? p.order_index).padStart(2, "0");
          return (
            <Link
              key={p.slug}
              href={`/fases/${p.slug}`}
              className="group relative aspect-[2/3] w-56 shrink-0 snap-start overflow-hidden rounded-xl border border-white/[0.08] bg-surface-elevated shadow-card transition-all duration-300 hover:z-10 hover:scale-[1.05] hover:border-brand-violet/40 hover:shadow-glow-violet sm:w-64 lg:w-72"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Cover image o gradient fallback */}
              {p.cover_image_url ? (
                <Image
                  src={p.cover_image_url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 224px, (max-width: 1024px) 256px, 288px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br",
                    accent,
                  )}
                >
                  {/* Patrón decorativo cuando no hay imagen real */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_2px_at_25%_30%,white_99%,transparent_100%),radial-gradient(circle_1px_at_72%_44%,white_99%,transparent_100%),radial-gradient(circle_1px_at_88%_18%,white_99%,transparent_100%),radial-gradient(circle_2px_at_12%_72%,white_99%,transparent_100%),radial-gradient(circle_1px_at_55%_82%,white_99%,transparent_100%)]"
                  />
                  {/* Número grande del bloque (centrado en idle) */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-grotesk text-[120px] font-bold leading-none text-white/15 transition-all duration-500 group-hover:scale-90 group-hover:opacity-0 sm:text-[140px]">
                      {String(p.order_index).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              )}

              {/* Gradient overlay siempre presente para legibilidad */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/80 to-transparent"
              />

              {/* Badge bloque arriba-izq */}
              <div className="absolute left-3 top-3 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 font-inter text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                  Bloque {String(p.order_index).padStart(2, "0")}
                </span>
              </div>

              {/* Contenido inferior: dimensión + título + subtitle visible idle, promise on hover */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-4 sm:p-5">
                <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-coral">
                  Dimensión {dimN}{p.dimension_name ? ` · ${p.dimension_name}` : ""}
                </p>
                <h3 className="font-grotesk text-lg font-bold leading-tight text-white sm:text-xl">
                  {heroTitle}
                </h3>
                {p.subtitle && (
                  <p className="line-clamp-2 font-inter text-xs leading-snug text-white/75 transition-opacity duration-300 group-hover:opacity-100">
                    {p.subtitle}
                  </p>
                )}

                {/* Reveal on hover */}
                <div className="grid grid-rows-[0fr] transition-all duration-300 group-hover:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    {p.promise && (
                      <p className="mt-2 font-inter text-xs italic leading-relaxed text-white/90">
                        {p.promise}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-inter text-[10px] uppercase tracking-widest text-white/60">
                        {p.modules_count} módulos
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-coral px-3 py-1 font-inter text-xs font-semibold text-white">
                        Ver bloque
                        <ArrowRight className="size-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Estilos para ocultar scrollbar (Webkit + Firefox) */}
      <style jsx>{`
        :global(.netflix-rail) {
          scrollbar-width: none;
        }
        :global(.netflix-rail)::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
