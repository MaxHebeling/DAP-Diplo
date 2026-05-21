"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqPageSchema, jsonLd } from "@/lib/seo/structured-data";

const FAQS = [
  {
    q: "¿Qué incluye la suscripción de $25/mes?",
    a: "Acceso a las clases premium del mes que tengas desbloqueado, a todas las sesiones en vivo (MasterClass y especiales), a la mentoría grupal mensual y a la comunidad de pastores del diplomado.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí. Cancelas con un click desde tu cuenta. Sin penalizaciones ni periodos forzados. Pagas mes a mes.",
  },
  {
    q: "¿Qué pasa si cancelo a la mitad?",
    a: "Pierdes el acceso al contenido mientras tu suscripción esté inactiva — pero tu progreso queda guardado intacto. Si vuelves a suscribirte, retomas exactamente donde lo dejaste, con los meses que ya tenías desbloqueados.",
  },
  {
    q: "¿Cómo se desbloquea cada mes académico?",
    a: "Cada mes de suscripción activa se libera un nuevo mes académico, siempre que hayas aprobado todos los módulos del mes anterior. Si no completas, el cobro se pausa automáticamente hasta que avances — no se te cobra de más.",
  },
  {
    q: "¿Cuánto tiempo tengo para terminar cada mes?",
    a: "No expira mientras mantengas la suscripción activa. Y si necesitas más tiempo, puedes pedir hasta 1 extensión por bloque (60 días adicionales).",
  },
  {
    q: "¿Los certificados son válidos institucionalmente?",
    a: "Los certificados del DAP son emitidos por la Red Apostólica Reino y Avivamiento. Son reconocidos dentro de nuestra red ministerial; no son títulos académicos universitarios. El valor está en la dimensión ministerial que respaldan, no en validez estatal. Estamos en trámites de dos acreditaciones —una acreditación curricular en México y otra de una Universidad de Estados Unidos para el resto del mundo, con respaldo oficial—. Se comunicará públicamente cuando esté confirmado.",
  },
  {
    q: "¿Hay material descargable?",
    a: "Sí. Cada módulo incluye PDFs y audios descargables relacionados con la enseñanza. El alumno los conserva mientras esté suscrito.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      {/* JSON-LD FAQPage — habilita rich snippet con expansibles en Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(faqPageSchema(FAQS)),
        }}
      />
      <div className="mx-auto max-w-3xl">
        <div className="mb-12">
          <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            Preguntas frecuentes
          </p>
          <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
            Lo que necesitas saber antes de <span className="gradient-text">suscribirte</span>.
          </h2>
        </div>

        <Accordion multiple={false} className="w-full">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border-white/[0.08]"
            >
              <AccordionTrigger className="py-6 text-left font-grotesk text-lg font-semibold text-text-primary hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-justify font-inter text-base leading-relaxed text-text-secondary">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
