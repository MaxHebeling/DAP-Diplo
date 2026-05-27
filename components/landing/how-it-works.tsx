import { getTranslations } from "next-intl/server";
import { CalendarClock, CreditCard, Trophy } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { PerspectivePath } from "./perspective-path";

const ACCENT_BG: Record<"violet" | "coral" | "amber", string> = {
  violet: "bg-brand-violet/10 text-brand-violet",
  coral: "bg-brand-coral/10 text-brand-coral",
  amber: "bg-brand-amber/10 text-brand-amber",
};

export async function HowItWorks() {
  const t = await getTranslations("Landing");

  const STEPS = [
    {
      icon: CreditCard,
      title: t("howItWorks.step1Title"),
      body: t("howItWorks.step1Body"),
      accent: "violet",
    },
    {
      icon: CalendarClock,
      title: t("howItWorks.step2Title"),
      body: t("howItWorks.step2Body"),
      accent: "coral",
    },
    {
      icon: Trophy,
      title: t("howItWorks.step3Title"),
      body: t("howItWorks.step3Body"),
      accent: "amber",
    },
  ] as const;

  return (
    <section
      id="modelo"
      className="relative isolate overflow-hidden border-t border-white/[0.06] px-6 py-28 sm:py-36"
    >
      <PerspectivePath />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("howItWorks.eyebrow")}
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("howItWorks.titleLead")}{" "}
              <span className="gradient-text">{t("howItWorks.titleHighlight")}</span>.
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="h-full rounded-xl border border-white/[0.06] bg-surface-elevated/80 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet">
                  <div
                    className={`mb-5 inline-flex size-12 items-center justify-center rounded-xl ${ACCENT_BG[step.accent]}`}
                  >
                    <Icon className="size-6" strokeWidth={1.8} />
                  </div>
                  <div className="mb-2 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                    {t("howItWorks.stepLabel")} {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
