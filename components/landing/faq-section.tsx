"use client";

import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqPageSchema, jsonLd } from "@/lib/seo/structured-data";

export function FaqSection() {
  const t = useTranslations("Landing");

  const FAQS = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
    { q: t("faq.q7"), a: t("faq.a7") },
  ];

  return (
    <section
      id="faq"
      className="border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      {/* JSON-LD FAQPage — habilita rich snippet con expansibles en Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(faqPageSchema(FAQS)),
        }}
      />
      <div className="mx-auto max-w-3xl">
        <div className="mb-12">
          <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("faq.eyebrow")}
          </p>
          <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
            {t("faq.titleLead")} <span className="gradient-text">{t("faq.titleHighlight")}</span>.
          </h2>
        </div>

        <Accordion multiple={false} className="w-full">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border-white/[0.08]"
            >
              <AccordionTrigger className="py-6 text-left font-grotesk text-lg font-semibold text-text-primary hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-justify font-inter text-base leading-relaxed text-text-secondary">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
