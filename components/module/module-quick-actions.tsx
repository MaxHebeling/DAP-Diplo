import { Download, FileText, FilePlus2 } from "lucide-react";
import { Link } from "@/i18n/navigation";

/**
 * Banner destacado al inicio de cada módulo con las dos acciones que
 * el alumno necesita siempre a mano: descargar el PDF del módulo y
 * subir su tarea (sección Activación).
 *
 * - Si el módulo tiene un recurso `kind = "pdf"` muestra el botón de
 *   descarga apuntando al primer PDF encontrado. Si tiene varios PDFs,
 *   el dropdown se renderiza en `SectionTeaching`; acá mostramos solo
 *   el principal para no abrumar.
 * - El botón de "Subir tarea" siempre aparece (lleva a ?section=activation).
 *
 * Server component — no necesita estado.
 */

export type Resource = {
  id: string;
  title: string;
  kind: "pdf" | "audio" | "link" | "slides" | "other";
  url: string;
};

export function ModuleQuickActions({
  resources,
  phaseSlug,
  moduleSlug,
  alreadySubmitted,
}: {
  resources: Resource[];
  phaseSlug: string;
  moduleSlug: string;
  alreadySubmitted: boolean;
}) {
  const mainPdf = resources.find((r) => r.kind === "pdf");

  return (
    <section
      aria-label="Acciones rápidas del módulo"
      className="grid gap-3 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-brand-violet/[0.06] via-surface-elevated to-brand-coral/[0.04] p-4 sm:grid-cols-2 sm:gap-4 sm:p-5"
    >
      {/* PDF descargable */}
      {mainPdf ? (
        <a
          href={mainPdf.url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="group flex items-start gap-3 rounded-xl border border-brand-violet/30 bg-brand-violet/[0.08] p-4 transition-all hover:border-brand-violet/60 hover:bg-brand-violet/[0.12]"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet/20 text-brand-violet transition-transform group-hover:scale-110">
            <FileText className="size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.28em] text-brand-violet">
              Material del módulo
            </p>
            <p className="mt-1 truncate font-grotesk text-sm font-bold text-text-primary sm:text-base">
              {mainPdf.title}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 font-inter text-xs text-text-secondary">
              <Download className="size-3" />
              Descargar PDF
            </p>
          </div>
        </a>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-tertiary">
            <FileText className="size-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.28em] text-text-tertiary">
              Material del módulo
            </p>
            <p className="mt-1 font-inter text-sm text-text-secondary">
              El PDF de esta semana se publica pronto.
            </p>
          </div>
        </div>
      )}

      {/* Subir tarea */}
      <Link
        href={`/fases/${phaseSlug}/modulos/${moduleSlug}?section=activation`}
        className={`group flex items-start gap-3 rounded-xl border p-4 transition-all ${
          alreadySubmitted
            ? "border-emerald-400/30 bg-emerald-400/[0.06] hover:border-emerald-400/50"
            : "border-brand-coral/30 bg-brand-coral/[0.08] hover:border-brand-coral/60 hover:bg-brand-coral/[0.12]"
        }`}
      >
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
            alreadySubmitted
              ? "bg-emerald-400/20 text-emerald-400"
              : "bg-brand-coral/20 text-brand-coral"
          }`}
        >
          <FilePlus2 className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`font-inter text-[10px] font-bold uppercase tracking-[0.28em] ${
              alreadySubmitted ? "text-emerald-400" : "text-brand-coral"
            }`}
          >
            {alreadySubmitted ? "Tu entrega" : "Activación práctica"}
          </p>
          <p className="mt-1 font-grotesk text-sm font-bold text-text-primary sm:text-base">
            {alreadySubmitted ? "Ya enviaste tu tarea" : "Subir mi tarea"}
          </p>
          <p className="mt-0.5 font-inter text-xs text-text-secondary">
            {alreadySubmitted
              ? "El Director la revisará en 48 horas."
              : "Llega directo al Director del DAP."}
          </p>
        </div>
      </Link>
    </section>
  );
}
