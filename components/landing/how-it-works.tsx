import { CalendarClock, CreditCard, Trophy } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const STEPS = [
  {
    icon: CreditCard,
    title: "Te suscribes",
    body: "$25 USD/mes vía Stripe. Acceso inmediato al Mes 1 y a todas las sesiones en vivo. Cancela cuando quieras.",
    accent: "violet",
  },
  {
    icon: CalendarClock,
    title: "Estudias a tu ritmo",
    body: "Lunes clase grabada premium. Miércoles MasterClass en vivo. Viernes activación práctica. Una vez al mes, mentoría grupal.",
    accent: "coral",
  },
  {
    icon: Trophy,
    title: "Avanzas y desbloqueas dimensiones",
    body: "Cada 2 meses se libera un nuevo bloque. Al completarlo recibes certificado, insignia y una dimensión ministerial — de Discípulo hasta Enviado.",
    accent: "amber",
  },
] as const;

const ACCENT_BG: Record<(typeof STEPS)[number]["accent"], string> = {
  violet: "bg-brand-violet/10 text-brand-violet",
  coral: "bg-brand-coral/10 text-brand-coral",
  amber: "bg-brand-amber/10 text-brand-amber",
};

export function HowItWorks() {
  return (
    <section
      id="modelo"
      className="border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Cómo funciona
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Un camino claro de 18 meses, en <span className="gradient-text">tres pasos</span>.
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="h-full rounded-xl border border-white/[0.06] bg-surface-elevated p-8 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet">
                  <div
                    className={`mb-5 inline-flex size-12 items-center justify-center rounded-xl ${ACCENT_BG[step.accent]}`}
                  >
                    <Icon className="size-6" strokeWidth={1.8} />
                  </div>
                  <div className="mb-2 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                    Paso {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="font-inter text-sm leading-relaxed text-text-secondary">
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
