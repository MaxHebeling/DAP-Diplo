import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden bg-neutral-950 pt-24 sm:pt-16">
      {/* Imagen de fondo + capas de oscuridad sobre ella */}
      <Image
        src="https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=2400&q=85"
        alt=""
        priority
        fill
        sizes="100vw"
        className="-z-20 object-cover opacity-40"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-neutral-950" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_30%,rgba(30,58,138,0.22),transparent)]" />

      <div className="mx-auto w-full max-w-5xl px-6 py-20 text-center">
        <p className="mb-7 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
          Diplomado Apostólico Pastoral
        </p>
        <h1 className="mb-8 font-serif text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-neutral-50 sm:text-6xl md:text-7xl lg:text-[5rem]">
          Forma pastores integrales
          <br className="hidden sm:block" />
          que transformen su generación.
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-balance text-base leading-relaxed text-neutral-300 sm:text-lg md:text-xl">
          18 meses. 200 módulos. 9 rangos ministeriales. Una formación que une
          revelación espiritual con liderazgo, gobierno, finanzas, empresas y
          tecnología.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            className="h-12 w-full bg-brand-navy px-7 text-base font-medium text-brand-navy-foreground hover:bg-brand-navy/90 sm:w-auto"
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
        <p className="mt-6 text-xs text-neutral-400">
          Cancela cuando quieras. Sin compromiso.
        </p>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-neutral-950"
      />
    </section>
  );
}
