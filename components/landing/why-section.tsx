import { Reveal } from "@/components/landing/reveal";

export function WhySection() {
  return (
    <section
      id="diplomado"
      className="border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            Por qué el DAP
          </p>
          <h2 className="mb-12 font-grotesk text-h1 font-bold leading-tight text-text-primary">
            No otro curso. Una <span className="gradient-text">formación integral</span>.
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="space-y-6 font-inter text-base leading-relaxed text-text-secondary md:text-lg">
            <p>
              La mayoría de las escuelas ministeriales del mundo hispano solo
              forman <span className="text-text-primary font-medium">predicadores</span>. El
              pastor sale sabiendo exponer un texto, pero llega a su iglesia y
              no sabe organizar un equipo, leer un estado de cuentas, levantar
              una fundación, plantar una empresa del Reino, ni gobernar una
              ciudad.
            </p>
            <p>
              El DAP existe para formar al{" "}
              <span className="text-text-primary font-medium">
                líder apostólico completo
              </span>
              : pastor + administrador + reformador + empresario + estratega +
              mentor + comunicador + gobernador espiritual. Las 9 dimensiones
              de la unción apostólica en un solo programa.
            </p>
            <p>
              Cada uno de los 9 bloques cubre una dimensión y otorga una
              dimensión ministerial real al completarlo. Al cierre de los 18
              meses, eres un líder enviado — preparado para reformar
              territorios, no solo predicar en ellos.
            </p>
            <p className="text-text-tertiary">
              No es un curso para acumular información. Es un proceso de
              formación que entrega autoridad ministerial.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
