"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

import { AR_MARRIAGE_PRICE_USD_DISPLAY } from "@/lib/data/argentina";

/**
 * Banner premium del descuento especial. Aparece SOLO cuando el
 * matrimonio Argentina está activo. Diseño "Quiet Authority":
 * elegante, sutil glow, sin gritar "cupón barato".
 */
export function DiscountBanner() {
  const t = useTranslations("Onboarding.discountBanner");
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-brand-coral/35 bg-gradient-to-r from-[#1A0E2E] via-[#2A0F3D] to-[#1A0E2E] p-4 shadow-[0_0_0_1px_rgba(255,77,109,0.18),0_12px_36px_-14px_rgba(255,77,109,0.45)]"
    >
      {/* Glow radial premium */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90 [background:radial-gradient(60%_120%_at_0%_50%,rgba(123,97,255,0.20),transparent_55%),radial-gradient(60%_120%_at_100%_50%,rgba(255,77,109,0.18),transparent_55%)]"
      />

      {/* Shimmer line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-coral/60 to-transparent"
      />

      <div className="flex items-start gap-3.5">
        {/* Flag chip */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-xl">
          🇦🇷
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-brand-coral">
            {t("eyebrow")}
          </p>
          <h3 className="mt-1 font-grotesk text-base font-bold leading-snug text-text-primary sm:text-lg">
            {t("title")}
          </h3>
          <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
            <span className="font-semibold text-text-primary">
              {AR_MARRIAGE_PRICE_USD_DISPLAY}
              {t("priceSuffix")}
            </span>
            {t("bodyAfter")}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-inter text-[11px] text-text-tertiary">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              {t("featureSingle")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              {t("featureNoDuplicate")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-400" />
              {t("featureCancelable")}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
