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

// Perspective path background — vanishing point en (720, 240) sobre
// viewBox 1440x800. Líneas convergen al horizonte; spacings horizontales
// se compactan logarítmicamente.
function PerspectivePath() {
  const VP_X = 720;
  const VP_Y = 240;
  // Lanes: x final (en y=800) — 9 líneas extendiéndose más allá del viewport
  const lanes = [-260, 60, 320, 540, 720, 900, 1120, 1380, 1700];
  // Horizontal cross lines: y positions con spacing logarítmico
  const crosses = [
    { y: 800, half: 720 },
    { y: 600, half: 460 },
    { y: 460, half: 290 },
    { y: 370, half: 188 },
    { y: 310, half: 124 },
    { y: 275, half: 84 },
    { y: 252, half: 50 },
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Base */}
      <div className="absolute inset-0 bg-surface-base" />

      {/* Vanishing point glow */}
      <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 size-[420px] rounded-full bg-brand-violet/[0.18] blur-[110px]" />
      <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 size-[260px] rounded-full bg-brand-coral/[0.12] blur-[80px]" />

      {/* Horizon line */}
      <div className="absolute left-0 right-0 top-[30%] h-px bg-gradient-to-r from-transparent via-brand-violet/30 to-transparent" />

      {/* Perspective SVG (bottom 70% of section) */}
      <svg
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-[70%] w-full"
      >
        <defs>
          <linearGradient id="lane-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7B61FF" stopOpacity="0" />
            <stop offset="35%" stopColor="#7B61FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="cross-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Vertical lane lines converging to vanishing point */}
        <g stroke="url(#lane-fade)" strokeWidth="0.8">
          {lanes.map((endX, i) => (
            <line key={i} x1={VP_X} y1={VP_Y} x2={endX} y2={800} />
          ))}
        </g>

        {/* Horizontal cross lines (perspective foreshortening) */}
        <g stroke="url(#cross-fade)" strokeWidth="0.8" strokeLinecap="round">
          {crosses.map((c, i) => (
            <line
              key={i}
              x1={VP_X - c.half}
              y1={c.y}
              x2={VP_X + c.half}
              y2={c.y}
            />
          ))}
        </g>
      </svg>

      {/* Top fade (suaviza la transición a la sección anterior + protege
          la legibilidad del header de la sección) */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-surface-base to-transparent" />
    </div>
  );
}

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
              Un camino claro de 18 meses, en{" "}
              <span className="gradient-text">tres pasos</span>.
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
