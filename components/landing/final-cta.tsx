import { getTranslations } from "next-intl/server";
import { ArrowRight, Sparkles } from "lucide-react";

import { OnboardingCTA } from "@/components/onboarding/onboarding-cta";
import { Reveal } from "@/components/landing/reveal";

export async function FinalCta() {
  const t = await getTranslations("Landing");
  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36">
      {/* Cosmic background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_30%_50%,rgba(123,97,255,0.35),transparent_55%),radial-gradient(50%_50%_at_70%_55%,rgba(255,77,109,0.3),transparent_55%)]"
      />

      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 font-inter text-xs font-medium uppercase tracking-widest text-text-secondary backdrop-blur">
            <Sparkles className="size-3.5 text-brand-coral" />
            {t("finalCta.badge")}
          </p>
          <h2 className="mb-6 font-grotesk text-display font-bold leading-[1.05] text-text-primary">
            {t("finalCta.titleLead")} <span className="gradient-text">{t("finalCta.titleHighlight")}</span> {t("finalCta.titleTrail")}
          </h2>
          <p className="mb-10 mx-auto max-w-xl text-justify font-inter text-base leading-relaxed text-text-secondary md:text-lg">
            {t("finalCta.subtitle")}
          </p>
          <OnboardingCTA size="lg">
            {t("finalCta.cta")}
            <ArrowRight />
          </OnboardingCTA>
          <p className="mt-6 font-inter text-xs text-text-tertiary">
            {t("finalCta.disclaimer")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
