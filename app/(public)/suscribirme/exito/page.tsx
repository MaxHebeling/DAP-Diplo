import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/landing/reveal";

export const metadata = {
  title: "¡Bienvenido al diplomado!",
  robots: { index: false, follow: true },
};

export default function SubscribeSuccessPage() {
  return (
    <div className="flex flex-1 flex-col bg-neutral-950 text-neutral-50">
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <Reveal>
          <div className="mx-auto max-w-md text-center">
            <div className="mb-10 flex justify-center">
              <Logo size="lg" variant="light" />
            </div>
            <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-full bg-brand-coral/15">
              <Check
                className="size-8 text-brand-coral"
                strokeWidth={2.5}
                aria-hidden
              />
            </div>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
              Suscripción confirmada
            </p>
            <h1 className="mb-6 font-serif text-balance text-4xl font-semibold leading-tight sm:text-5xl">
              ¡Bienvenido al diplomado!
            </h1>
            <p className="mb-10 text-base leading-relaxed text-neutral-300">
              Tu suscripción se está activando. En unos segundos recibirás un
              correo de Stripe con la confirmación de tu pago. Desde tu
              dashboard podrás comenzar con la Fase 1.
            </p>
            <Button
              size="lg"
              className="h-12 bg-brand-coral px-8 text-base font-medium text-brand-coral-foreground hover:bg-brand-coral/90"
              render={<Link href="/dashboard" />}
            >
              Ir a mi dashboard
            </Button>
            <p className="mt-5 text-xs text-neutral-500">
              ¿No ves tu acceso aún? Recarga el dashboard en 10 segundos.
            </p>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
