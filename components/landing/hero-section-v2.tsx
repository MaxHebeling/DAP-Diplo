"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";

import { DapButton } from "@/components/ui-dap/button";
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
      {/* Background: cosmic gradient + radial glows + subtle stars */}
      <div className="absolute inset-0 -z-30 bg-gradient-cosmic" />
      <div className="absolute inset-0 -z-20 opacity-60 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.35),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.28),transparent_60%)]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18] [background-image:radial-gradient(circle_1px_at_25%_30%,white_99%,transparent_100%),radial-gradient(circle_1px_at_72%_44%,white_99%,transparent_100%),radial-gradient(circle_1px_at_88%_18%,white_99%,transparent_100%),radial-gradient(circle_1px_at_12%_72%,white_99%,transparent_100%),radial-gradient(circle_1px_at_55%_82%,white_99%,transparent_100%),radial-gradient(circle_1px_at_38%_15%,white_99%,transparent_100%),radial-gradient(circle_1px_at_82%_75%,white_99%,transparent_100%)] [background-repeat:no-repeat]"
      />

      {/* Animated particles (cosmic network) */}
      <HeroParticles intensity="cosmic" className="absolute inset-0 -z-[5]" />

      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 pb-20 pt-32 text-center sm:pt-40"
      >
        {/* Logo entrance: scale + fade in al cargar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 1.2,
            delay: 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative mb-2 flex items-center justify-center"
        >
          <div
            aria-hidden
            className="absolute -inset-x-20 inset-y-0 -z-10 [background:radial-gradient(50%_70%_at_50%_50%,rgba(123,97,255,0.35),transparent_70%)] blur-xl"
          />
          <Image
            src="/dap-logo-white.png"
            alt="DAP"
            width={560}
            height={560}
            priority
            sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, (max-width: 1024px) 440px, 560px"
            className="size-64 drop-shadow-[0_0_40px_rgba(123,97,255,0.45)] sm:size-80 md:size-[440px] lg:size-[560px]"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mb-10 font-grotesk text-xs font-medium uppercase tracking-[0.36em] text-text-secondary sm:text-sm"
        >
          Diplomado · Apostólico · Pastoral
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="mx-auto max-w-3xl font-grotesk text-h2 font-bold leading-[1.15] text-text-primary md:text-h1 md:leading-[1.1]"
        >
          Formamos líderes para{" "}
          <span className="gradient-text">transformar personas</span>,
          iglesias, empresas y territorios.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <DapButton render={<Link href="/suscribirme" />} size="lg">
            Comienza tu transformación
            <ArrowRight />
          </DapButton>
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
          transition={{ duration: 0.6, delay: 1.3 }}
          className="mt-6 font-inter text-xs text-text-tertiary"
        >
          18 meses · 9 bloques · 200 módulos · desde $25/mes
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
