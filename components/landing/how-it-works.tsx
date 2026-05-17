import { CalendarClock, CreditCard, Trophy } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const STEPS = [
  {
    icon: CreditCard,
    title: "Te suscribes",
    body: "$25 USD/mes vía Stripe. Acceso inmediato al Bloque 1 y a todas las sesiones en vivo. Cancela cuando quieras.",
  },
  {
    icon: CalendarClock,
    title: "Estudias a tu ritmo",
    body: "Lunes clase grabada premium. Miércoles MasterClass en vivo. Viernes activación práctica. Una vez al mes, mentoría grupal.",
  },
  {
    icon: Trophy,
    title: "Avanzas y desbloqueas rangos",
    body: "Cada 2 meses se libera un nuevo bloque. Al completarlo recibes certificado, insignia y un rango ministerial — de Discípulo hasta Enviado.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-white/5 bg-neutral-950 px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
              Cómo funciona
            </p>
            <h2 className="font-serif text-balance text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
              Un camino claro de 18 meses, en tres pasos.
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 sm:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="h-full bg-neutral-950 p-8 sm:p-10">
                  <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-brand-coral/15 text-brand-coral">
                    <Icon className="size-6" strokeWidth={1.5} />
                  </div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-500">
                    Paso {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mb-3 font-serif text-2xl font-semibold text-neutral-50">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-400">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
