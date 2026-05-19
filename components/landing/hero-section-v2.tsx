import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

import { DapButton } from "@/components/ui-dap/button";
import { HeroParticles } from "./hero-particles";

export function HeroSectionV2() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Background: cosmic gradient + radial glows + subtle stars */}
      <div className="absolute inset-0 -z-30 bg-gradient-cosmic" />
      <div className="absolute inset-0 -z-20 opacity-60 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.35),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.28),transparent_60%)]" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18] [background-image:radial-gradient(circle_1px_at_25%_30%,white_99%,transparent_100%),radial-gradient(circle_1px_at_72%_44%,white_99%,transparent_100%),radial-gradient(circle_1px_at_88%_18%,white_99%,transparent_100%),radial-gradient(circle_1px_at_12%_72%,white_99%,transparent_100%),radial-gradient(circle_1px_at_55%_82%,white_99%,transparent_100%),radial-gradient(circle_1px_at_38%_15%,white_99%,transparent_100%),radial-gradient(circle_1px_at_82%_75%,white_99%,transparent_100%)] [background-repeat:no-repeat]"
      />

      {/* Animated particles (cosmic network) */}
      <HeroParticles intensity="cosmic" className="absolute inset-0 -z-[5]" />

      <div className="mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 pb-20 pt-32 text-center sm:pt-40">
        {/* Logo DAP grande como centerpiece (mismo wireframe que el del header) */}
        <div className="relative mb-2 flex items-center justify-center">
          <div
            aria-hidden
            className="absolute -inset-x-20 inset-y-0 -z-10 [background:radial-gradient(50%_70%_at_50%_50%,rgba(123,97,255,0.35),transparent_70%)] blur-xl"
          />
          <Image
            src="/dap-logo-white.png"
            alt="DAP"
            width={420}
            height={420}
            priority
            className="size-48 drop-shadow-[0_0_40px_rgba(123,97,255,0.45)] sm:size-64 md:size-80 lg:size-[420px]"
          />
        </div>

        <p className="mb-10 font-grotesk text-xs font-medium uppercase tracking-[0.36em] text-text-secondary sm:text-sm">
          Diplomado · Apostólico · Pastoral
        </p>

        <h1 className="mx-auto max-w-3xl font-grotesk text-h2 font-bold leading-[1.15] text-text-primary md:text-h1 md:leading-[1.1]">
          Formamos líderes para{" "}
          <span className="gradient-text">transformar personas</span>,
          iglesias, empresas y territorios.
        </h1>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
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
        </div>

        <p className="mt-6 font-inter text-xs text-text-tertiary">
          18 meses · 9 bloques · 200 módulos · desde $25/mes
        </p>
      </div>

      {/* Bottom fade into next section (surface-base) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-surface-base"
      />
    </section>
  );
}
