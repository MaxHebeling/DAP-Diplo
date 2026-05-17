import { Reveal } from "@/components/landing/reveal";

export function WhySection() {
  return (
    <section
      id="diplomado"
      className="border-t border-white/5 bg-neutral-950 px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
            Por qué el DAP
          </p>
          <h2 className="mb-12 font-serif text-balance text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
            No otro curso. Una formación integral.
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="space-y-7 text-justify text-lg leading-relaxed text-neutral-300 hyphens-auto">
            <p>
              La mayoría de las escuelas ministeriales del mundo hispano solo
              forman <span className="text-neutral-50">predicadores</span>. El
              pastor sale sabiendo exponer un texto, pero llega a su iglesia y
              no sabe organizar un equipo, leer un estado de cuentas, levantar
              una fundación, plantar una empresa del Reino, ni gobernar una
              ciudad.
            </p>
            <p>
              El DAP existe para formar al{" "}
              <span className="text-neutral-50">líder apostólico completo</span>
              : pastor + administrador + reformador + empresario + estratega +
              mentor + comunicador + gobernador espiritual. Las 9 dimensiones de
              la unción apostólica en un solo programa.
            </p>
            <p>
              Cada uno de los 9 bloques cubre una dimensión y otorga un rango
              ministerial real al completarlo. Al cierre de los 18 meses, eres
              un líder enviado — preparado para reformar territorios, no solo
              predicar en ellos.
            </p>
            <p className="text-neutral-400">
              No es un curso para acumular información. Es un proceso de
              formación que entrega autoridad ministerial.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
