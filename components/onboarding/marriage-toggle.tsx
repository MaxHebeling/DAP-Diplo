"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Heart, Sparkles } from "lucide-react";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/**
 * Card-checkbox premium que aparece SOLO cuando el país es Argentina.
 * Activa el flujo de inscripción de matrimonio con descuento.
 *
 * Visual: borde animado, bandera AR sutil, glow violet→coral al estar
 * activa, sin checkbox nativo (toda la card es clickable).
 */
export function MarriageToggle({ checked, onChange, disabled }: Props) {
  const t = useTranslations("Onboarding.marriageToggle");
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={[
        "group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-brand-violet/60 bg-gradient-to-br from-brand-violet/[0.12] via-white/[0.02] to-brand-coral/[0.10] shadow-[0_0_0_1px_rgba(123,97,255,0.25),0_8px_28px_-12px_rgba(123,97,255,0.55)]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-brand-violet/35 hover:bg-brand-violet/[0.05]",
      ].join(" ")}
    >
      {/* Glow radial al estar activa */}
      {checked && (
        <motion.div
          layoutId="marriage-glow"
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(80%_120%_at_0%_0%,rgba(123,97,255,0.22),transparent_60%),radial-gradient(80%_120%_at_100%_100%,rgba(255,77,109,0.18),transparent_60%)]"
        />
      )}

      <div className="flex items-start gap-3.5">
        {/* Icon disc */}
        <div
          className={[
            "flex size-10 shrink-0 items-center justify-center rounded-xl transition-all",
            checked
              ? "bg-gradient-to-br from-brand-violet to-brand-coral text-white shadow-lg shadow-brand-coral/30"
              : "bg-white/[0.04] text-text-secondary group-hover:bg-white/[0.07]",
          ].join(" ")}
        >
          <Heart
            className={checked ? "size-5" : "size-5"}
            strokeWidth={checked ? 2.5 : 1.8}
            fill={checked ? "currentColor" : "none"}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-grotesk text-sm font-semibold text-text-primary">
              {t("title")}
            </p>
            <span className="text-xs">🇦🇷</span>
          </div>
          <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
            {t("descriptionBefore")}
            <span className="text-brand-coral">{t("descriptionHighlight")}</span>
          </p>
        </div>

        {/* Custom checkbox indicator */}
        <div
          className={[
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
            checked
              ? "border-brand-coral bg-brand-coral"
              : "border-white/20 bg-transparent group-hover:border-white/40",
          ].join(" ")}
        >
          {checked && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18 }}
              viewBox="0 0 20 20"
              fill="none"
              className="size-3.5 text-white"
            >
              <path
                d="M5 10.5L8.5 14L15 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </div>
      </div>

      {/* Sparkle decorativo */}
      {checked && (
        <Sparkles
          aria-hidden
          className="absolute right-3 top-3 size-3 animate-pulse text-brand-coral/60"
        />
      )}
    </button>
  );
}
