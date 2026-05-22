"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

/**
 * Número de WhatsApp de contacto para la oportunidad de pastores.
 * Formato internacional sin "+", espacios ni guiones.
 */
const WA_NUMBER = "19565095558";
const WA_MESSAGE =
  "Hola, vi la oportunidad para pastores en DAP y quiero activarla.";

function buildWaLink(): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;
}

export function PromoFinalCta() {
  return (
    <section className="relative overflow-hidden px-6 py-32 sm:py-44">
      {/* Cinematic bg: gradient profundo + glow inferior + halo central */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(80%_60%_at_50%_100%,rgba(123,97,255,0.45),transparent_65%),radial-gradient(60%_50%_at_50%_30%,rgba(255,77,109,0.20),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-[#04081A] via-[#04081A]/40 to-transparent"
      />

      {/* Sweep horizontal sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="font-grotesk text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          <span className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
            No se trata
          </span>
          <br />
          <span className="bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
            solo de estudiar…
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-8 max-w-xl font-inter text-lg leading-relaxed text-text-secondary sm:text-xl"
        >
          Se trata de{" "}
          <span className="text-text-primary">levantar generaciones</span>,
          formar líderes y{" "}
          <span className="bg-gradient-to-r from-brand-violet to-brand-coral bg-clip-text text-transparent">
            transformar territorios.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 flex flex-col items-center gap-4"
        >
          <a
            href={buildWaLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-brand-violet via-brand-coral to-brand-violet bg-[length:220%_100%] bg-left px-10 py-5 font-inter text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_20px_60px_-15px_rgba(255,77,109,0.55),0_8px_30px_-10px_rgba(123,97,255,0.55)] transition-all duration-500 hover:bg-right hover:shadow-[0_25px_70px_-15px_rgba(255,77,109,0.7),0_10px_36px_-10px_rgba(123,97,255,0.7)] sm:text-base"
          >
            {/* Halo interno animado */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"
            />
            Quiero activar esta oportunidad
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <p className="font-inter text-xs text-text-tertiary">
            Te respondemos personalmente por WhatsApp.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
