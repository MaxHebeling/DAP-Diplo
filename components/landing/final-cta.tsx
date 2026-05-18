import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-coral px-6 py-28 sm:py-36">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,255,255,0.18),transparent)]"
      />
      <div className="mx-auto max-w-3xl text-center text-brand-coral-foreground">
        <Reveal>
          <h2 className="mb-6 font-serif text-balance text-4xl font-semibold leading-tight sm:text-6xl">
            Empieza tu diplomado apostólico hoy.
          </h2>
          <p className="mb-10 text-balance text-base sm:text-lg">
            $25 USD/mes. Acceso inmediato a la Fase 1 y a las sesiones en vivo.
            Cancela cuando quieras.
          </p>
          <Button
            size="lg"
            className="h-12 bg-neutral-950 px-8 text-base font-medium text-neutral-50 hover:bg-neutral-900"
            render={<Link href="/suscribirme" />}
          >
            Suscribirme ahora
          </Button>
          <p className="mt-5 text-xs opacity-70">
            Procesado por Stripe. Tu suscripción comienza al confirmar el pago.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
