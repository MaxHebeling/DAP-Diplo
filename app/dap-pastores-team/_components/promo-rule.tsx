"use client";

import { motion } from "motion/react";
import { Check, GraduationCap, HeartHandshake, Users } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Regla de la promoción 12 + 12. Dos cards conectadas que muestran
 * la mecánica del pastor y luego del/la cónyuge. Diseño glass + glow
 * + número grande tipo countdown visual.
 */
export function PromoRule() {
  const t = useTranslations("PastoresTeam");
  const audienceKeys = [
    "leaders",
    "servers",
    "volunteers",
    "members",
    "youth",
    "entrepreneurs",
  ] as const;
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.42em] text-brand-coral">
            {t("rule.eyebrow")}
          </p>
          <h2 className="mt-4 font-grotesk text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl">
            {t("rule.headingTop")}
            <br />
            <span className="bg-gradient-to-r from-brand-violet via-[#A28BFF] to-brand-coral bg-clip-text text-transparent">
              {t("rule.headingBottom")}
            </span>
          </h2>
        </motion.div>

        <div className="relative mt-16 grid gap-6 md:grid-cols-2 md:gap-8">
          {/* Línea de conexión entre cards (desktop) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-brand-violet/30 to-transparent md:block"
          />

          <RuleCard
            step={1}
            number={12}
            title={t("rule.card1Title")}
            highlight={t("rule.card1Highlight")}
            icon={<GraduationCap className="size-6" strokeWidth={1.6} />}
            from="from-brand-violet"
            to="to-[#A28BFF]"
            delay={0}
          />
          <RuleCard
            step={2}
            number={24}
            title={t("rule.card2Title")}
            highlight={t("rule.card2Highlight")}
            icon={<HeartHandshake className="size-6" strokeWidth={1.6} />}
            from="from-brand-coral"
            to="to-[#FF8AA0]"
            delay={0.15}
          />
        </div>

        {/* Bloque de "quiénes pueden inscribirse" */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-12 overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-violet/15 text-brand-violet">
              <Users className="size-5" strokeWidth={1.7} />
            </div>
            <div className="flex-1">
              <h3 className="font-grotesk text-lg font-semibold text-text-primary">
                {t("rule.openTitle")}
              </h3>
              <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
                {t("rule.openBody")}
              </p>

              <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                {audienceKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 font-inter text-sm text-text-secondary"
                  >
                    <Check
                      className="size-3.5 text-brand-violet"
                      strokeWidth={3}
                    />
                    {t(`rule.audience.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function RuleCard({
  step,
  number,
  title,
  highlight,
  icon,
  from,
  to,
  delay,
}: {
  step: number;
  number: number;
  title: string;
  highlight: string;
  icon: React.ReactNode;
  from: string;
  to: string;
  delay: number;
}) {
  const t = useTranslations("PastoresTeam");
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-8 backdrop-blur-sm transition-all hover:border-white/[0.12]"
    >
      {/* Glow hover */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(60%_60%_at_50%_0%,rgba(123,97,255,0.18),transparent_60%)]`}
      />

      <div className="flex items-center justify-between">
        <span className="font-inter text-[10px] font-semibold uppercase tracking-[0.42em] text-text-tertiary">
          {t("rule.step", { step })}
        </span>
        <div
          className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${from} ${to} text-white shadow-lg shadow-brand-violet/30`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-8 flex items-baseline gap-4">
        <span
          className={`bg-gradient-to-br ${from} ${to} bg-clip-text font-grotesk text-[88px] font-bold leading-none tracking-tight text-transparent sm:text-[112px]`}
        >
          {number}
        </span>
        <span className="font-inter text-sm uppercase tracking-[0.2em] text-text-tertiary">
          {t("rule.people")}
        </span>
      </div>

      <p className="mt-6 font-grotesk text-xl font-semibold leading-snug text-text-primary">
        {title}
      </p>
      <p className="mt-3 font-inter text-base leading-relaxed text-text-secondary">
        →{" "}
        <span className="font-semibold text-text-primary">{highlight}</span>
      </p>
    </motion.div>
  );
}
