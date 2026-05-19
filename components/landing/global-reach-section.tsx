import { Globe } from "./globe";

export function GlobalReachSection() {
  return (
    <section
      id="diplomado"
      className="relative overflow-hidden border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            ¿Por qué el DAP?
          </p>
          <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
            No es otro curso. Es una{" "}
            <span className="gradient-text">formación integral</span>.
          </h2>
          <div className="mt-8 space-y-5 font-inter text-base leading-relaxed text-text-secondary">
            <p>
              La mayoría de las escuelas ministeriales del mundo hispano solo
              forman{" "}
              <span className="font-medium text-text-primary">predicadores</span>.
              El pastor sale sabiendo exponer un texto, pero llega a su iglesia
              y no sabe organizar un equipo, leer un estado de cuentas,
              levantar una fundación, plantar una empresa del Reino, ni
              gobernar una ciudad.
            </p>
            <p>
              El DAP existe para formar al{" "}
              <span className="font-medium text-text-primary">
                líder apostólico completo
              </span>
              : pastor + administrador + reformador + empresario + estratega
              + mentor + comunicador + gobernador espiritual. Las 9
              dimensiones de la unción apostólica en un solo programa.
            </p>
            <p className="text-text-tertiary">
              No es un curso para acumular información. Es un proceso de
              formación que entrega autoridad ministerial.
            </p>
          </div>
        </div>

        {/* Globe */}
        <div className="flex justify-center">
          <Globe size="lg" intensity="cosmic" className="hidden lg:block" />
          <Globe size="md" intensity="cosmic" className="block lg:hidden" />
        </div>
      </div>
    </section>
  );
}
