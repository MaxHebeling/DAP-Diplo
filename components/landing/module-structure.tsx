import { Reveal } from "@/components/landing/reveal";

const PARTS = [
  {
    number: "01",
    title: "Introducción",
    body: "Objetivo del módulo, revelación principal y aplicación inmediata. Te alineas con la palabra antes de entrar a la enseñanza.",
  },
  {
    number: "02",
    title: "Enseñanza",
    body: "Contenido bíblico, práctico y moderno. Doctrina apostólica con lente del mundo actual, no de hace 80 años.",
  },
  {
    number: "03",
    title: "Activación",
    body: "Un ejercicio práctico para aplicar de inmediato en tu ministerio, tu familia o tu liderazgo. Sin activación, no hay impartición real.",
  },
  {
    number: "04",
    title: "Evaluación",
    body: "Test que mide comprensión. Aprobar es requisito para completar el módulo y, al final del bloque, recibir el rango.",
  },
  {
    number: "05",
    title: "Frase de impartición",
    body: "La palabra apostólica de cierre. Una sentencia que sella el módulo en tu espíritu y queda como declaración sobre tu vida.",
  },
];

export function ModuleStructure() {
  return (
    <section
      id="estructura"
      className="border-t border-white/5 bg-neutral-950 px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
              Cada módulo, 5 partes
            </p>
            <h2 className="font-serif text-balance text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
              Una experiencia consistente en cada clase.
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PARTS.map((part, i) => (
            <Reveal key={part.number} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-white/10 bg-neutral-900/40 p-7 transition-colors hover:border-brand-coral/30">
                <div className="mb-6 font-serif text-3xl font-semibold text-brand-coral">
                  {part.number}
                </div>
                <h3 className="mb-3 font-serif text-xl font-semibold text-neutral-50">
                  {part.title}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-400">
                  {part.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
