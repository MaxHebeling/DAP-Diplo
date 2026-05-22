"use client";

import { motion } from "motion/react";
import {
  BookOpen,
  Building2,
  Coins,
  Compass,
  Cpu,
  Crown,
  Network,
  Sparkles,
} from "lucide-react";

const ITEMS = [
  {
    icon: BookOpen,
    title: "Formación bíblica",
    desc: "Fundamentos sólidos, doctrina apostólica con visión moderna del Reino.",
  },
  {
    icon: Compass,
    title: "Liderazgo",
    desc: "Carácter, gobierno, mentoreo. Formas líderes que forman líderes.",
  },
  {
    icon: Coins,
    title: "Finanzas",
    desc: "Mayordomía, economía del Reino, multiplicación con sabiduría.",
  },
  {
    icon: Building2,
    title: "Administración",
    desc: "Estructura, orden, sistemas que sostienen el crecimiento ministerial.",
  },
  {
    icon: Network,
    title: "Empresas",
    desc: "Plantar empresas del Reino. Influencia desde el mercado y la cultura.",
  },
  {
    icon: Cpu,
    title: "Tecnología & IA",
    desc: "Domina las herramientas que dominan el siglo XXI. Sin perder el alma.",
  },
  {
    icon: Sparkles,
    title: "Comunicación moderna",
    desc: "Storytelling, medios, marca personal. Tu mensaje llega más lejos.",
  },
  {
    icon: Crown,
    title: "Gobierno del Reino",
    desc: "Reforma territorios. Autoridad apostólica que va más allá del púlpito.",
  },
];

export function PromoBenefits() {
  return (
    <section className="relative px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.42em] text-brand-coral">
            Lo que incluye
          </p>
          <h2 className="mt-4 font-grotesk text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            <span className="bg-gradient-to-br from-white via-white to-white/70 bg-clip-text text-transparent">
              Una formación
            </span>{" "}
            <span className="bg-gradient-to-r from-brand-violet to-brand-coral bg-clip-text text-transparent">
              integral.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl font-inter text-base leading-relaxed text-text-secondary">
            8 dimensiones, 72 semanas. El DAP forma al líder completo:
            pastor, administrador, reformador, comunicador, mentor,
            empresario, estratega y gobernador espiritual.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <BenefitCard key={item.title} {...item} delay={(i % 4) * 0.08} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: typeof BookOpen;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-sm transition-all hover:border-brand-violet/35 hover:-translate-y-0.5"
    >
      {/* Glow hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(80%_120%_at_0%_0%,rgba(123,97,255,0.22),transparent_70%)]"
      />

      <div className="flex size-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-brand-violet transition-all group-hover:border-brand-violet/30 group-hover:text-white">
        <Icon className="size-5" strokeWidth={1.6} />
      </div>
      <h3 className="mt-5 font-grotesk text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
        {desc}
      </p>
    </motion.div>
  );
}
