"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/module/markdown";
import {
  submitAssignmentAction,
  uploadAssignmentAttachmentAction,
} from "@/lib/assignments/actions";

export type ActivationSubmission = {
  id: string;
  status: "open" | "submitted" | "correcting" | "completed" | "incomplete" | "not_submitted";
  content_text: string | null;
  opens_at: string;
  closes_at: string;
  submitted_at: string | null;
  ai_feedback: string | null;
  ai_score: number | null;
  ai_passed: boolean | null;
  corrected_at: string | null;
  results_sent_at: string | null;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Componente principal de la sección Activación.
 *
 * Si no hay submission (alumno no entró todavía o no tiene semana
 * activa): muestra solo el body_md de la consigna.
 *
 * Si hay submission: switch por status:
 *  - open → form de entrega con countdown a closes_at
 *  - submitted/correcting → "en revisión, llega en 48h"
 *  - completed/incomplete → vista de feedback con markdown del Dr. Max
 *  - not_submitted → "la ventana cerró sin entrega" (read-only)
 */
export function ActivationSubmission({
  submission,
  consignaMd,
}: {
  submission: ActivationSubmission | null;
  consignaMd: string | null;
}) {
  const t = useTranslations("Module");
  return (
    <div className="space-y-6">
      {consignaMd && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("activation.consignaLabel")}
          </p>
          <Markdown>{consignaMd}</Markdown>
        </div>
      )}

      {!submission && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("activation.notOpenYet")}
          </p>
        </div>
      )}

      {submission?.status === "open" && (
        <OpenForm submission={submission} />
      )}

      {(submission?.status === "submitted" ||
        submission?.status === "correcting") && (
        <PendingCorrectionView submission={submission} />
      )}

      {(submission?.status === "completed" ||
        submission?.status === "incomplete") && (
        <FeedbackView submission={submission} />
      )}

      {submission?.status === "not_submitted" && (
        <NotSubmittedView submission={submission} />
      )}
    </div>
  );
}

// ---------- States ----------

function OpenForm({ submission }: { submission: ActivationSubmission }) {
  const t = useTranslations("Module");
  const router = useRouter();
  const [text, setText] = useState(submission.content_text ?? "");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ path: string; filename: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("submissionId", submission.id);
      fd.set("file", file);
      const res = await uploadAssignmentAttachmentAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAttachment({ path: res.path, filename: res.filename });
      toast.success(`Adjunto subido: ${res.filename}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 20) {
      toast.error(t("activation.tooShortToast"));
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("submissionId", submission.id);
      fd.set("contentText", text.trim());
      if (attachment?.path) fd.set("attachmentPath", attachment.path);
      if (attachment?.filename) fd.set("attachmentName", attachment.filename);
      const res = await submitAssignmentAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? t("activation.submittedToast"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("activation.yourSubmission")}
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-300">
            <Clock className="size-3" />
            {t("activation.closesAt", { date: formatDateTime(submission.closes_at) })}
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={t("activation.placeholder")}
          className="w-full resize-y rounded-md border border-white/[0.08] bg-white/[0.04] p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span
            className={
              text.trim().length < 20
                ? "text-amber-300"
                : "text-emerald-300"
            }
          >
            {text.trim().length < 20
              ? `Mínimo 20 caracteres (${text.trim().length} hasta ahora)`
              : `${text.trim().length} caracteres`}
          </span>
          <span className="inline-flex items-center gap-1 text-white/55">
            <Send className="size-3 text-brand-coral" />
            Llega al Director del DAP
          </span>
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-2 text-xs text-white/55">
            Opcional: si hiciste la tarea en Word/PDF, podés adjuntarla además del texto.
          </p>
          {attachment ? (
            <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-emerald-200">
                <Paperclip className="size-4" />
                {attachment.filename}
              </span>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-white/55 hover:text-white"
                aria-label="Quitar adjunto"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.odt,.txt,.rtf,.jpg,.jpeg,.png"
                onChange={onPickFile}
                disabled={uploading || pending}
                className="block w-full text-xs text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-brand-violet/20 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-violet hover:file:bg-brand-violet/30 file:cursor-pointer disabled:opacity-50"
              />
              <p className="mt-1 text-[11px] text-white/40">
                PDF, Word, ODT, TXT, RTF, JPG, PNG · máx 10 MB
              </p>
              {uploading && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-300">
                  <Loader2 className="size-3 animate-spin" /> Subiendo archivo…
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={pending || text.trim().length < 20}
          className="bg-brand-coral text-white hover:bg-brand-coral/90 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("activation.submitting")}
            </>
          ) : (
            <>
              <Send className="size-4" />
              {t("activation.submit")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function PendingCorrectionView({
  submission,
}: {
  submission: ActivationSubmission;
}) {
  const t = useTranslations("Module");
  const eta = submission.submitted_at
    ? new Date(
        new Date(submission.submitted_at).getTime() + 48 * 60 * 60 * 1000,
      )
    : null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-8 text-center">
      <Clock className="mx-auto size-9 text-amber-400" strokeWidth={1.7} />
      <h3 className="mt-4 font-grotesk text-xl font-semibold">
        {t("activation.pendingTitle")}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t.rich("activation.pendingBody", {
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      {eta && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("activation.availableApprox")}</span>
          <span className="font-medium text-amber-200">
            {formatDateTime(eta.toISOString())}
          </span>
        </p>
      )}
      {submission.content_text && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            {t("activation.viewYourSubmission")}
          </summary>
          <div className="mt-3 whitespace-pre-wrap rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-sm leading-relaxed text-foreground/90">
            {submission.content_text}
          </div>
        </details>
      )}
    </div>
  );
}

function FeedbackView({ submission }: { submission: ActivationSubmission }) {
  const t = useTranslations("Module");
  const passed = submission.ai_passed === true;
  return (
    <div className="space-y-4">
      <div
        className={[
          "rounded-2xl border p-6",
          passed
            ? "border-emerald-500/30 bg-emerald-500/[0.05]"
            : "border-brand-coral/30 bg-brand-coral/[0.05]",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          {passed ? (
            <CheckCircle2 className="size-7 text-emerald-400" />
          ) : (
            <XCircle className="size-7 text-brand-coral" />
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {passed ? t("activation.feedbackApproved") : t("activation.feedbackNeedsReview")}
            </p>
            <p className="font-grotesk text-2xl font-semibold leading-tight">
              {submission.ai_score ?? "—"}
              <span className="text-base text-muted-foreground">/100</span>
            </p>
          </div>
          <p className="ml-auto text-xs text-muted-foreground">
            {submission.corrected_at
              ? t("activation.correctedOn", { date: formatDateTime(submission.corrected_at) })
              : null}
          </p>
        </div>
      </div>

      {submission.ai_feedback && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            <Sparkles className="size-3" />
            {t("activation.wordFromDrMax")}
          </p>
          <Markdown>{submission.ai_feedback}</Markdown>
        </div>
      )}

      {submission.content_text && (
        <details className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
            {t("activation.originalSubmission")}
          </summary>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {submission.content_text}
          </div>
        </details>
      )}
    </div>
  );
}

function NotSubmittedView({
  submission,
}: {
  submission: ActivationSubmission;
}) {
  const t = useTranslations("Module");
  return (
    <div className="rounded-2xl border border-muted-foreground/20 bg-muted/[0.04] p-8 text-center">
      <Clock className="mx-auto size-9 text-muted-foreground" strokeWidth={1.7} />
      <h3 className="mt-4 font-grotesk text-lg font-semibold">
        {t("activation.windowClosedTitle")}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t("activation.windowClosedBody", {
          opens: formatDateTime(submission.opens_at),
          closes: formatDateTime(submission.closes_at),
        })}
      </p>
    </div>
  );
}
