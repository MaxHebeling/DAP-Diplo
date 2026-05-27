import { getTranslations } from "next-intl/server";

import { Globe } from "./globe";

export async function GlobalReachSection() {
  const t = await getTranslations("Landing");
  return (
    <section
      id="diplomado"
      className="relative overflow-hidden border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("globalReach.eyebrow")}
          </p>
          <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
            {t("globalReach.titleLead")}{" "}
            <span className="gradient-text">{t("globalReach.titleHighlight")}</span>.
          </h2>
          <div className="mt-8 space-y-5 font-inter text-base leading-relaxed text-text-secondary">
            <p>
              {t("globalReach.p1a")}{" "}
              <span className="font-medium text-text-primary">{t("globalReach.p1Highlight")}</span>
              {t("globalReach.p1b")}
            </p>
            <p>
              {t("globalReach.p2a")}{" "}
              <span className="font-medium text-text-primary">
                {t("globalReach.p2Highlight")}
              </span>
              {t("globalReach.p2b")}
            </p>
            <p className="text-text-tertiary">
              {t("globalReach.p3")}
            </p>
          </div>
        </div>

        {/* Globe */}
        <div className="flex justify-center">
          <Globe size="lg" intensity="cosmic" className="hidden lg:block" />
          <Globe size="md" intensity="cosmic" className="block lg:hidden" />
        </div>
      </div>
    </section>
  );
}
