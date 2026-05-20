import { CalendarClock, CreditCard, Trophy } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { PerspectivePath } from "./perspective-path";

const STEPS = [
  {
    icon: CreditCard,
    title: "Postulás y te suscribís",
    body: "Completás el formulario de admisión y, una vez aprobada, activás tu suscripción de $25 USD/mes. Tu calendario personal arranca el primer martes después de la aprobación.",
    accent: "violet",
  },
  {
    icon: CalendarClock,
    title: "1 módulo cada semana",
    body: "Cada martes 00:01 se abre un módulo nuevo (de 72 en total). La activación práctica la corrige el Ap. Max Hebeling con feedback personal en 48h. MasterClass en vivo por evento — mínimo 1 al mes.",
    accent: "coral",
  },
  {
    icon: Trophy,
    title: "Completás un bloque, recibís tu dimensión",
    body: "Al aprobar los 8 módulos de un bloque, recibís certificado, insignia y una dimensión ministerial — de Discípulo hasta Enviado, las 9 dimensiones del Reino.",
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
      className="relative isolate overflow-hidden border-t border-white/[0.06] px-6 py-28 sm:py-36"
    >
      <PerspectivePath />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              ¿Cómo funciona?
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              72 semanas, 9 bloques, una sola{" "}
              <span className="gradient-text">cadencia</span>.
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="h-full rounded-xl border border-white/[0.06] bg-surface-elevated/80 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet">
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
                  <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
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
