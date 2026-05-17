import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[92vh] flex-col justify-between overflow-hidden bg-neutral-950 pt-28 pb-12 sm:pt-32 sm:pb-16">
      {/* Imagen de fondo + capas de oscuridad sobre ella */}
      <Image
        src="/hero.jpg"
        alt="Conferencia apostólica con audiencia atenta y predicador en el escenario"
        priority
        fill
        sizes="100vw"
        className="-z-20 object-cover opacity-70"
      />
      {/* Vignette: oscuro arriba y abajo, foto más visible al centro */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950 via-neutral-950/35 to-neutral-950" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_18%,rgba(253,173,90,0.22),transparent)]" />

      {/* TOP: eyebrow */}
      <div className="mx-auto w-full max-w-5xl px-6 text-center">
        <h1 className="text-[0.7rem] font-medium uppercase tracking-[0.36em] text-brand-coral sm:text-xs">
          Diplomado Apostólico Pastoral
        </h1>
      </div>

      {/* BOTTOM: CTAs + microcopy */}
      <div className="mx-auto w-full max-w-5xl px-6 text-center">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            className="h-12 w-full bg-brand-coral px-7 text-base font-medium text-brand-coral-foreground hover:bg-brand-coral/90 sm:w-auto"
            render={<Link href="/suscribirme" />}
          >
            Inscríbete ahora — $25/mes
          </Button>
          <Button
            size="lg"
            variant="ghost"
            className="h-12 w-full px-7 text-base font-medium text-neutral-200 hover:bg-white/5 hover:text-neutral-50 sm:w-auto"
            render={<a href="#diplomado" />}
          >
            Ver el diplomado
          </Button>
        </div>
        <p className="mt-5 text-xs text-neutral-300">
          Cancela cuando quieras. Sin compromiso.
        </p>
      </div>
    </section>
  );
}
