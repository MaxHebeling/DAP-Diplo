import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/landing/reveal";

export async function ModuleStructure() {
  const t = await getTranslations("Landing");

  const PARTS = [
    {
      number: "01",
      title: t("moduleStructure.part1Title"),
      body: t("moduleStructure.part1Body"),
    },
    {
      number: "02",
      title: t("moduleStructure.part2Title"),
      body: t("moduleStructure.part2Body"),
    },
    {
      number: "03",
      title: t("moduleStructure.part3Title"),
      body: t("moduleStructure.part3Body"),
    },
    {
      number: "04",
      title: t("moduleStructure.part4Title"),
      body: t("moduleStructure.part4Body"),
    },
    {
      number: "05",
      title: t("moduleStructure.part5Title"),
      body: t("moduleStructure.part5Body"),
    },
  ];

  return (
    <section
      id="estructura"
      className="border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("moduleStructure.eyebrow")}
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("moduleStructure.titleLead")} <span className="gradient-text">{t("moduleStructure.titleHighlight")}</span> {t("moduleStructure.titleTrail")}
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PARTS.map((part, i) => (
            <Reveal key={part.number} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300 hover:border-brand-coral/30">
                <div className="mb-6 font-grotesk text-h2 font-bold gradient-text leading-none">
                  {part.number}
                </div>
                <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                  {part.title}
                </h3>
                <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                  {part.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
