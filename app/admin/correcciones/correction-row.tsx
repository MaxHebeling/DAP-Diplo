import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

type Submission = {
  id: string;
  submitted_at: string;
  corrected_at: string | null;
  ai_score: number | null;
  ai_passed: boolean | null;
  status: string;
  content_text: string | null;
};

type ModuleMini = {
  title: string;
  slug: string;
  courseWeek: number | null;
  phaseTitle: string;
  phaseSlug: string;
};

export function CorrectionRow({
  submission,
  studentName,
  module: mod,
}: {
  submission: Submission;
  studentName: string;
  module: ModuleMini | null;
}) {
  const passed = submission.ai_passed === true;
  const preview = (submission.content_text ?? "").slice(0, 140);

  return (
    <Link
      href={`/admin/correcciones/${submission.id}`}
      className="group block rounded-xl border border-border bg-card/60 p-5 transition hover:border-brand-violet/50 hover:bg-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-grotesk text-base font-semibold text-foreground">
              {studentName}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-inter text-sm text-muted-foreground">
              {mod
                ? `Mód ${mod.courseWeek ?? "?"} — ${mod.title}`
                : "módulo desconocido"}
            </span>
          </div>
          {preview && (
            <p className="line-clamp-2 font-inter text-sm text-muted-foreground">
              {preview}
              {(submission.content_text?.length ?? 0) > 140 && "…"}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {passed ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Aprobado {submission.ai_score}/10
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-3 py-1 text-xs font-medium text-amber-400">
              <AlertCircle className="size-3.5" /> Incompleto {submission.ai_score}/10
            </div>
          )}
          <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </div>
    </Link>
  );
}
