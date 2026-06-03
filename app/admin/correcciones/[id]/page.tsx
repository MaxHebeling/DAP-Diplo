import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Markdown } from "@/components/module/markdown";
import { CorrectionEditor } from "./editor";

export const dynamic = "force-dynamic";

type SubmissionFull = {
  id: string;
  user_id: string;
  module_id: string;
  module_section_id: string;
  content_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  submitted_at: string;
  corrected_at: string | null;
  ai_feedback: string | null;
  ai_score: number | null;
  ai_passed: boolean | null;
  results_sent_at: string | null;
  status: string;
};

export default async function CorreccionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, module_id, module_section_id, content_text, attachment_url, attachment_name, submitted_at, corrected_at, ai_feedback, ai_score, ai_passed, results_sent_at, status",
    )
    .eq("id", id)
    .maybeSingle<SubmissionFull>();

  if (!sub) notFound();

  const [profileRes, moduleRes, sectionRes] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, matricula")
      .eq("id", sub.user_id)
      .maybeSingle<{ full_name: string; matricula: string | null }>(),
    admin
      .from("modules")
      .select(
        "id, title, slug, course_week, objective, main_revelation, phase:phases(slug, title)",
      )
      .eq("id", sub.module_id)
      .maybeSingle<{
        id: string;
        title: string;
        slug: string;
        course_week: number | null;
        objective: string | null;
        main_revelation: string | null;
        phase: { slug: string; title: string } | null;
      }>(),
    admin
      .from("module_sections")
      .select("body_md, title")
      .eq("id", sub.module_section_id)
      .maybeSingle<{ body_md: string | null; title: string | null }>(),
  ]);

  const student = profileRes.data;
  const mod = moduleRes.data;
  const sec = sectionRes.data;

  const alreadySent = sub.results_sent_at !== null;

  let attachmentSignedUrl: string | null = null;
  if (sub.attachment_url) {
    const { data: signed } = await admin.storage
      .from("assignment-attachments")
      .createSignedUrl(sub.attachment_url, 60 * 30); // 30 min
    attachmentSignedUrl = signed?.signedUrl ?? null;
  }

  return (
    <main className="px-6 py-8 lg:px-10">
      <Link
        href="/admin/correcciones"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver a correcciones
      </Link>

      <header className="mb-8">
        <p className="mb-1 inline-flex items-center gap-1.5 font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
          <Sparkles className="size-3" /> Review IA
        </p>
        <h1 className="font-grotesk text-2xl font-bold text-foreground">
          {mod ? `Mód ${mod.course_week ?? "?"} — ${mod.title}` : "Módulo"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <User className="size-3.5" /> {student?.full_name ?? "Alumno"}
            {student?.matricula && (
              <span className="font-mono text-xs">· {student.matricula}</span>
            )}
          </div>
          <span>·</span>
          <span>
            Entregó {new Date(sub.submitted_at).toLocaleDateString("es-AR")}
          </span>
          {sub.corrected_at && (
            <>
              <span>·</span>
              <span>
                IA corrigió{" "}
                {new Date(sub.corrected_at).toLocaleDateString("es-AR")}
              </span>
            </>
          )}
        </div>
      </header>

      {alreadySent && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm text-emerald-400">
          <CheckCircle2 className="mr-1.5 inline size-4" />
          Esta corrección ya fue aprobada y enviada al alumno el{" "}
          {new Date(sub.results_sent_at!).toLocaleString("es-AR")}.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda — consigna + entrega */}
        <div className="space-y-5">
          {sec?.body_md && (
            <section className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="mb-3 font-grotesk text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Consigna
              </h2>
              <Markdown>{sec.body_md}</Markdown>
            </section>
          )}

          <section className="rounded-xl border border-border bg-card/40 p-5">
            <h2 className="mb-3 inline-flex items-center gap-1.5 font-grotesk text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <FileText className="size-3.5" /> Entrega del alumno
            </h2>
            {sub.content_text ? (
              <p className="whitespace-pre-wrap font-inter text-sm leading-relaxed text-foreground">
                {sub.content_text}
              </p>
            ) : (
              <p className="font-inter text-sm italic text-muted-foreground">
                (sin texto, solo adjunto)
              </p>
            )}

            {attachmentSignedUrl && (
              <a
                href={attachmentSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-brand-violet/30 bg-brand-violet/[0.06] px-3 py-1.5 text-sm text-brand-violet transition hover:bg-brand-violet/[0.12]"
              >
                <Paperclip className="size-3.5" />
                {sub.attachment_name ?? "Ver adjunto"} ↗
              </a>
            )}
          </section>
        </div>

        {/* Columna derecha — feedback IA editable */}
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card/40 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-1.5 font-grotesk text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <Sparkles className="size-3.5" /> Feedback generado por IA
              </h2>
              {sub.ai_passed ? (
                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="size-3" /> Sugerido aprobar ·{" "}
                  {sub.ai_score}/10
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-0.5 text-xs font-medium text-amber-400">
                  <AlertCircle className="size-3" /> Sugerido incompleto ·{" "}
                  {sub.ai_score}/10
                </div>
              )}
            </div>

            <CorrectionEditor
              submissionId={sub.id}
              initialFeedback={sub.ai_feedback ?? ""}
              initialPassed={sub.ai_passed ?? false}
              initialScore={sub.ai_score ?? 0}
              alreadySent={alreadySent}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
