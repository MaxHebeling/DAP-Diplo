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
    body: "Quiz que mide comprensión. Aprobar es requisito para completar el módulo y, al final del mes, desbloquear el siguiente.",
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
      className="border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Cada módulo, 5 partes
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Una experiencia <span className="gradient-text">consistente</span> en cada clase.
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PARTS.map((part, i) => (
            <Reveal key={part.number} delay={i * 0.05}>
              <div className="h-full rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300 hover:border-brand-coral/30">
                <div className="mb-6 font-grotesk text-h2 font-bold gradient-text leading-none">
                  {part.number}
                </div>
                <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                  {part.title}
                </h3>
                <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary hyphens-auto">
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
