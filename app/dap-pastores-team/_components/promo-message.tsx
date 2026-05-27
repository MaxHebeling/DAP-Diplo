"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

export function PromoMessage() {
  const t = useTranslations("PastoresTeam");
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-grotesk text-2xl font-medium leading-snug text-text-primary sm:text-3xl md:text-4xl"
        >
          {t("message.leadStart")}{" "}
          <span className="bg-gradient-to-r from-brand-violet to-brand-coral bg-clip-text text-transparent">
            {t("message.leadEmphasis")}
          </span>
          .
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-7 font-inter text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          {t("message.body")}
        </motion.p>
      </div>
    </section>
  );
}
