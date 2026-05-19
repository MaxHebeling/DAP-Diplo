import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { DapButton } from "@/components/ui-dap/button";
import { HeroParticles } from "./hero-particles";

export function HeroSectionV2() {
  return (
    <section className="relative isolate overflow-hidden bg-surface-base">
      {/* Layer -40: hero photo */}
      <Image
        src="/hero.jpg"
        alt="Conferencia apostólica con audiencia atenta y predicador en el escenario"
        fill
        sizes="100vw"
        priority
        className="-z-40 object-cover"
      />

      {/* Layer -35: dark vignette (legibility top + bottom) */}
      <div className="absolute inset-0 -z-35 bg-gradient-to-b from-surface-base/85 via-surface-base/50 to-surface-base" />

      {/* Layer -30: coral fuchsia tint sobre toda la imagen */}
      <div className="absolute inset-0 -z-30 bg-brand-coral/20 mix-blend-multiply" />

      {/* Layer -25: violet wash sobre todo (mantiene tono brand) */}
      <div className="absolute inset-0 -z-25 bg-brand-violet/15 mix-blend-overlay" />

      {/* Layer -20: radial glows ambient (sobre la imagen tintada) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 opacity-60 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.35),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.28),transparent_60%)]"
      />

      {/* Layer -10: subtle stars sutiles */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18] [background-image:radial-gradient(circle_1px_at_25%_30%,white_99%,transparent_100%),radial-gradient(circle_1px_at_72%_44%,white_99%,transparent_100%),radial-gradient(circle_1px_at_88%_18%,white_99%,transparent_100%),radial-gradient(circle_1px_at_12%_72%,white_99%,transparent_100%),radial-gradient(circle_1px_at_55%_82%,white_99%,transparent_100%),radial-gradient(circle_1px_at_38%_15%,white_99%,transparent_100%),radial-gradient(circle_1px_at_82%_75%,white_99%,transparent_100%)] [background-repeat:no-repeat]"
      />

      {/* Animated particles */}
      <HeroParticles intensity="cosmic" className="absolute inset-0 -z-[5]" />

      <div className="mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-6 pb-20 pt-32 text-center sm:pt-40">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 font-inter text-xs font-medium uppercase tracking-widest text-text-secondary backdrop-blur">
          <Sparkles className="size-3.5 text-brand-coral" />
          Diplomado Apostólico Pastoral · 18 meses
        </p>

        <h1 className="mx-auto max-w-4xl font-grotesk text-display font-bold leading-[1.05] text-text-primary">
          Formación{" "}
          <span className="gradient-text">apostólica integral</span>{" "}
          para pastores
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-justify font-inter text-base leading-relaxed text-text-secondary md:text-lg">
          9 bloques, 200 módulos, 18 meses académicos. Espiritualidad,
          liderazgo, gobierno, finanzas, empresas y tecnología. Premium,
          en español.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <DapButton render={<Link href="/suscribirme" />} size="lg">
            Empezar ahora — $25/mes
            <ArrowRight />
          </DapButton>
          <DapButton
            render={<a href="#bloques" />}
            variant="secondary"
            size="lg"
          >
            Ver los bloques
          </DapButton>
        </div>

        <p className="mt-6 font-inter text-xs text-text-tertiary">
          Cancela cuando quieras. Sin compromiso.
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
