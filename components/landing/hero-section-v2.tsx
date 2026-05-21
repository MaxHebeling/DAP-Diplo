"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";

import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
import { HeroParticles } from "./hero-particles";

export function HeroSectionV2() {
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll-out fade: como el usuario scrollea hacia abajo, el contenido del
  // hero se desvanece y sube ligeramente (parallax sutil).
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden"
    >
      {/* Background: cosmic photo + tints + radial glows */}
      <Image
        src="/hero-cosmic.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-40 object-cover opacity-90"
      />
      {/* Tinted overlay para legibilidad del texto */}
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-surface-base/70 via-surface-base/40 to-surface-base" />
      <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.25),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.18),transparent_60%)]" />

      {/* Particles más sutiles porque ya tenemos la foto detrás */}
      <HeroParticles intensity="cosmic" className="absolute inset-0 -z-[5] opacity-40" />

      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 pb-20 pt-32 text-center sm:pt-40"
      >
        {/* Logo DAP: centrado arriba del eyebrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 1.2,
            delay: 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative mb-8 flex items-center justify-center"
        >
          <div
            aria-hidden
            className="absolute -inset-x-12 inset-y-0 -z-10 [background:radial-gradient(50%_70%_at_50%_50%,rgba(123,97,255,0.35),transparent_70%)] blur-xl"
          />
          <Image
            src="/dap-logo-white.png"
            alt="DAP"
            width={400}
            height={400}
            priority
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 200px, 320px"
            className="size-32 drop-shadow-[0_0_40px_rgba(123,97,255,0.45)] sm:size-40 md:size-52 lg:size-72"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mb-8 font-grotesk text-xs font-medium uppercase tracking-[0.36em] text-text-secondary sm:text-sm"
        >
          Diplomado Apostólico Pastoral
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="mx-auto max-w-3xl font-grotesk text-h2 font-bold leading-[1.15] text-text-primary md:text-h1 md:leading-[1.1]"
        >
          Formamos líderes integrales que{" "}
          <span className="gradient-text">transforman su generación</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="mx-auto mt-6 max-w-2xl font-inter text-base leading-relaxed text-text-secondary md:text-lg"
        >
          72 semanas de formación · 9 Dimensiones ·{" "}
          <span className="font-medium text-text-primary">
            Una transformación sobrenatural.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.15 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <EnrollmentCTA href="/suscribirme" size="lg">
            Comienza tu transformación
            <ArrowRight />
          </EnrollmentCTA>
          <DapButton
            render={<a href="#bloques" />}
            variant="secondary"
            size="lg"
          >
            <PlayCircle />
            Ver el diplomado
          </DapButton>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="mt-6 font-inter text-xs text-text-tertiary"
        >
          $25 USD/mes · Acceso inmediato · Cancela cuando quieras
        </motion.p>
      </motion.div>

      {/* Bottom fade into next section (surface-base) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-surface-base"
      />
    </section>
  );
}
