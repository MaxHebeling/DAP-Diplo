"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

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
  const t = useTranslations("Landing");
  return (
    <div
      className="dap-stagger mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4"
    >
      {phases.map((p) => {
        const accent =
          ACCENT_GRADIENTS[(p.order_index - 1) % ACCENT_GRADIENTS.length];
        const heroTitle = p.brand_name ?? p.title;
        const dimN = String(
          p.dimension_order ?? p.order_index,
        ).padStart(2, "0");
        return (
            <Link
              key={p.slug}
              href={`/fases/${p.slug}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-surface-elevated shadow-card transition-all duration-300 hover:z-10 hover:scale-[1.05] hover:border-brand-violet/40 hover:shadow-glow-violet"
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

              {/* Badge bloque arriba-izq (sutil, no compite con el brand impreso) */}
              <div className="absolute left-2 top-2 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 font-inter text-[9px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                  {t("netflixRow.block", { n: String(p.order_index).padStart(2, "0") })}
                </span>
              </div>

              {/* Eyebrow dimensión arriba-der (sutil) */}
              <div className="absolute right-2 top-2 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-coral/85 px-2 py-0.5 font-inter text-[9px] font-semibold uppercase tracking-widest text-white shadow-sm">
                  {t("netflixRow.dimShort", { n: dimN })}
                </span>
              </div>

              {/* Hover overlay: gradient + info detallada solo on hover.
                  Idle queda 100% imagen (con el brand_name ya impreso). */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/90 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />

              <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-2 flex-col gap-1 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:p-3.5">
                <p className="font-inter text-[9px] font-semibold uppercase tracking-[0.18em] text-brand-coral">
                  {p.dimension_name ?? t("netflixRow.dimensionFallback", { n: dimN })}
                </p>
                <h3 className="sr-only">{heroTitle}</h3>
                {p.subtitle && (
                  <p className="line-clamp-2 font-inter text-xs font-semibold leading-snug text-white">
                    {p.subtitle}
                  </p>
                )}
                {p.promise && (
                  <p className="line-clamp-2 font-inter text-[11px] italic leading-snug text-white/85">
                    {p.promise}
                  </p>
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-inter text-[9px] uppercase tracking-widest text-white/60">
                    {t("netflixRow.modulesCount", { count: p.modules_count })}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-coral px-2 py-0.5 font-inter text-[10px] font-semibold text-white">
                    {t("netflixRow.view")}
                    <ArrowRight className="size-2.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
    </div>
  );
}
