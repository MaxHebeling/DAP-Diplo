import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertCircle, FileText, RotateCcw, Clock, Sparkles } from "lucide-react";

type Submission = {
  id: string;
  submitted_at: string;
  corrected_at: string | null;
  ai_score: number | null;
  ai_passed: boolean | null;
  status: string;
  content_text: string | null;
  revision_count?: number | null;
  last_returned_at?: string | null;
};

type ModuleMini = {
  title: string;
  slug: string;
  courseWeek: number | null;
  phaseTitle: string;
  phaseSlug: string;
};

/**
 * Formatea "14 jul · 08:47" en horario local del server (America/Argentina).
 * Usa Intl.DateTimeFormat para robustez i18n.
 */
function formatSubmittedAt(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d).replace(".", "");
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
  return `${date} · ${time}`;
}

export function CorrectionRow({
  submission,
  studentName,
  studentId,
  country,
  module: mod,
}: {
  submission: Submission;
  studentName: string;
  studentId: string;
  country?: string | null;
  module: ModuleMini | null;
}) {
  const passed = submission.ai_passed === true;
  const preview = (submission.content_text ?? "").slice(0, 140);
  const revisionCount = submission.revision_count ?? 0;
  const isResubmission = revisionCount > 0;
  const isPending = !submission.corrected_at; // IA todavía no corrigió
  const submittedLabel = formatSubmittedAt(submission.submitted_at);

  return (
    <div className="group block rounded-xl border border-border bg-card/60 p-5 transition hover:border-brand-violet/50 hover:bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Row 1: Badge de tipo + Nombre + Módulo */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {isResubmission ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
                <RotateCcw className="size-2.5" /> Reentrega #{revisionCount}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                <FileText className="size-2.5" /> 1ª entrega
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-coral/40 bg-brand-coral/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-brand-coral">
                <Sparkles className="size-2.5" /> IA pendiente
              </span>
            )}
            <Link
              href={`/admin/correcciones/alumno/${studentId}`}
              className="font-grotesk text-base font-semibold text-foreground hover:text-brand-coral hover:underline"
              title="Ver expediente completo"
            >
              {studentName}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="font-inter text-sm text-muted-foreground">
              {mod
                ? `Mód ${mod.courseWeek ?? "?"} — ${mod.title}`
                : "módulo desconocido"}
            </span>
          </div>

          {/* Row 2: timestamp + país */}
          <div className="mb-2 flex flex-wrap items-center gap-3 font-inter text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3" /> {submittedLabel}
            </span>
            {country && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
                {country}
              </span>
            )}
          </div>

          {preview && (
            <p className="line-clamp-2 font-inter text-sm text-muted-foreground">
              {preview}
              {(submission.content_text?.length ?? 0) > 140 && "…"}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isPending ? (
            <div className="flex items-center gap-1.5 rounded-full border border-brand-coral/30 bg-brand-coral/[0.06] px-3 py-1 text-xs font-medium text-brand-coral">
              <Sparkles className="size-3.5 animate-pulse" /> Corrigiendo
            </div>
          ) : passed ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Aprobado {submission.ai_score}/100
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-3 py-1 text-xs font-medium text-amber-400">
              <AlertCircle className="size-3.5" /> Incompleto {submission.ai_score}/100
            </div>
          )}
          <Link
            href={`/admin/correcciones/${submission.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-brand-violet/30 bg-brand-violet/[0.08] px-3 py-1.5 text-xs font-semibold text-brand-violet hover:bg-brand-violet/[0.15]"
          >
            Abrir <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
