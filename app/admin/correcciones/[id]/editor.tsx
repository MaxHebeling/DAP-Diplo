"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Eye, EyeOff } from "lucide-react";
import { Markdown } from "@/components/module/markdown";

export function CorrectionEditor({
  submissionId,
  initialFeedback,
  initialPassed,
  initialScore,
  alreadySent,
}: {
  submissionId: string;
  initialFeedback: string;
  initialPassed: boolean;
  initialScore: number;
  alreadySent: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback);
  const [passed, setPassed] = useState(initialPassed);
  const [score, setScore] = useState(initialScore);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleApprove() {
    if (alreadySent) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/correcciones/${submissionId}/approve`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ai_feedback: feedback,
            ai_passed: passed,
            ai_score: score,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin/correcciones");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fallo aprobar");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={passed}
            disabled={alreadySent}
            onChange={(e) => setPassed(e.target.checked)}
            className="size-4 rounded border-border accent-emerald-500"
          />
          <span className="font-inter text-foreground">Aprobado</span>
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <span className="font-inter text-muted-foreground">Score</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={score}
            disabled={alreadySent}
            onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm text-foreground"
          />
          <span className="font-inter text-xs text-muted-foreground">/ 10</span>
        </label>

        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          {preview ? (
            <>
              <EyeOff className="size-3.5" /> Editar
            </>
          ) : (
            <>
              <Eye className="size-3.5" /> Preview
            </>
          )}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[300px] rounded-lg border border-border bg-background p-4">
          <Markdown>{feedback}</Markdown>
        </div>
      ) : (
        <textarea
          value={feedback}
          disabled={alreadySent}
          onChange={(e) => setFeedback(e.target.value)}
          rows={18}
          className="w-full rounded-lg border border-border bg-background p-4 font-mono text-sm leading-relaxed text-foreground focus:border-brand-violet/60 focus:outline-none"
          placeholder="Feedback en markdown…"
        />
      )}

      {err && (
        <p className="rounded-md border border-red-500/30 bg-red-500/[0.06] p-2 text-sm text-red-400">
          {err}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleApprove}
          disabled={alreadySent || submitting || feedback.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-coral px-5 py-2.5 font-grotesk text-sm font-semibold text-white shadow-lg shadow-brand-violet/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Enviando…
            </>
          ) : alreadySent ? (
            <>Ya enviado</>
          ) : (
            <>
              <Send className="size-4" /> Aprobar y enviar al alumno
            </>
          )}
        </button>
      </div>
    </div>
  );
}
