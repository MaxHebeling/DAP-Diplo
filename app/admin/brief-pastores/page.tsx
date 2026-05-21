import { FileText, Download, Calendar, GraduationCap } from "lucide-react";

import {
  CLASSES_START_LABEL,
  ENROLLMENT_OPENS_LABEL,
} from "@/lib/launch/config";

export const metadata = { title: "Brief para pastores — Admin DAP" };

const SECCIONES = [
  {
    n: 1,
    title: "Apertura apostólica",
    body: "Saludo al pastor, visión del momento del Reino, qué es el DAP y para quién es.",
  },
  {
    n: 2,
    title: "Estructura y dimensiones",
    body: "18 meses · 72 módulos · 9 bloques · listado completo de las 9 dimensiones (Discípulo → Enviado) + metodología semanal martes-lunes.",
  },
  {
    n: 3,
    title: "Lo que incluye, inversión y fechas clave",
    body: "Bullets de valor, precio $25 USD/mes, garantía de 7 días, fechas (inscripciones 01 Jun · clases 23 Jun), pasos para inscribirse y firma del Dr. Max.",
  },
];

export default function AdminBriefPastoresPage() {
  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-coral/15 text-brand-coral">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Material institucional · Convocatoria 2026
            </p>
            <h1 className="mt-1 font-grotesk text-3xl font-bold tracking-tight">
              Brief para pastores
            </h1>
            <p className="mt-2 max-w-2xl font-inter text-sm leading-relaxed text-text-secondary">
              PDF de 3 páginas con todo el contenido del DAP — visión,
              estructura, dimensiones, metodología, inversión y fechas.
              Pensado para enviar por email, WhatsApp o imprimir y entregar
              en reuniones con pastores que estén considerando el programa.
            </p>
          </div>
        </header>

        <div className="rounded-2xl border border-brand-violet/25 bg-brand-violet/[0.05] p-6 sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-grotesk text-xl font-bold text-text-primary">
                brief-dap-pastores-2026.pdf
              </p>
              <p className="font-inter text-sm text-text-secondary">
                3 páginas · Branding DAP · Firma del Dr. Max incluida
              </p>
            </div>
            <a
              href="/admin/brief-pastores/download"
              download
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-brand-violet to-brand-coral px-6 py-3 font-inter text-sm font-semibold text-white shadow-lg shadow-brand-violet/20 transition-transform hover:scale-[1.02]"
            >
              <Download className="size-4" />
              Descargar PDF
            </a>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="font-grotesk text-lg font-semibold text-text-primary">
            Qué hay dentro
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {SECCIONES.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5"
              >
                <p className="font-grotesk text-2xl font-bold text-brand-violet">
                  0{s.n}
                </p>
                <p className="mt-1 font-grotesk text-sm font-semibold text-text-primary">
                  {s.title}
                </p>
                <p className="mt-2 font-inter text-xs leading-relaxed text-text-secondary">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-brand-coral/25 bg-brand-coral/[0.05] p-5">
            <Calendar className="mt-0.5 size-5 shrink-0 text-brand-coral" />
            <div>
              <p className="font-inter text-xs uppercase tracking-widest text-brand-coral">
                Apertura de inscripciones
              </p>
              <p className="mt-1 font-grotesk text-base font-semibold text-text-primary">
                {ENROLLMENT_OPENS_LABEL}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-brand-violet/25 bg-brand-violet/[0.05] p-5">
            <GraduationCap className="mt-0.5 size-5 shrink-0 text-brand-violet" />
            <div>
              <p className="font-inter text-xs uppercase tracking-widest text-brand-violet">
                Inicio de clases
              </p>
              <p className="mt-1 font-grotesk text-base font-semibold capitalize text-text-primary">
                {CLASSES_START_LABEL}
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-text-tertiary">
          <p className="font-medium text-text-secondary">Notas</p>
          <ul className="mt-2 space-y-1">
            <li>· El contenido del brief vive en{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                lib/brief/generate-pastor-brief.tsx
              </code>
              {" "}— edítalo ahí si necesitas cambiar copy.
            </li>
            <li>· Las fechas se importan de{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">
                lib/launch/config.ts
              </code>
              {" "}— si las muevo, el brief se actualiza solo.
            </li>
            <li>· El PDF se genera on-demand cada vez que clickeas descargar — no hay cache.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
