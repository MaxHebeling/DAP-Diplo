"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "¿Qué incluye la suscripción de $25/mes?",
    a: "Acceso a las clases grabadas premium del bloque que tengas desbloqueado, a todas las sesiones en vivo (MasterClass los miércoles, Activación los viernes), a la mentoría grupal mensual y a la comunidad de pastores del diplomado.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. Cancelas con un click desde tu cuenta. Sin penalizaciones ni periodos forzados. Pagas mes a mes.",
  },
  {
    q: "¿Qué pasa si cancelo a la mitad?",
    a: "Pierdes el acceso a los bloques mientras tu suscripción esté inactiva — pero tu progreso queda guardado intacto. Si vuelves a suscribirte, retomas exactamente donde lo dejaste, con los bloques que ya tenías desbloqueados.",
  },
  {
    q: "¿Cuándo se desbloquea cada bloque?",
    a: "Cada 2 meses de suscripción activa se libera un bloque nuevo. Empiezas con el Bloque 1 desde el día 1; el Bloque 2 a los 2 meses; el Bloque 3 a los 4 meses; y así hasta completar los 9 bloques en 18 meses.",
  },
  {
    q: "¿Cuánto tiempo tengo para terminar cada bloque?",
    a: "Tienes los 2 meses del bloque actual y el resto del diplomado para avanzar a tu ritmo. No expira mientras mantengas la suscripción activa.",
  },
  {
    q: "¿Los certificados son válidos institucionalmente?",
    a: "Los certificados del DAP son emitidos por la Red Apostólica Reino y Avivamiento. Son reconocidos dentro de nuestra red ministerial; no son títulos académicos universitarios. El valor está en el rango ministerial que respaldan, no en validez estatal.",
  },
  {
    q: "¿Hay material descargable?",
    a: "Sí. Cada módulo incluye PDFs, audios y plantillas descargables relacionadas con la enseñanza. El alumno los conserva mientras esté suscrito.",
  },
  {
    q: "¿Las clases en vivo son obligatorias?",
    a: "No. Todas las sesiones en vivo (miércoles, viernes, mensual) se graban y quedan disponibles para verlas cuando puedas. El programa está pensado para que avances a tu propio ritmo.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="border-t border-white/5 bg-neutral-950 px-6 py-28 sm:py-36"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-12">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
            Preguntas frecuentes
          </p>
          <h2 className="font-serif text-balance text-4xl font-semibold leading-tight text-neutral-50 sm:text-5xl">
            Lo que necesitas saber antes de suscribirte.
          </h2>
        </div>

        <Accordion multiple={false} className="w-full">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border-white/10"
            >
              <AccordionTrigger className="py-6 text-left font-serif text-lg font-medium text-neutral-50 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-neutral-400">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
