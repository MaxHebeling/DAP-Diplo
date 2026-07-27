"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Eye, EyeOff, RotateCcw, X } from "lucide-react";
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
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [returning, setReturning] = useState(false);

  async function handleReturn() {
    if (alreadySent) return;
    if (revisionNote.trim().length < 10) {
      setErr("Escribí al menos 10 caracteres en la nota de revisión");
      return;
    }
    setReturning(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/correcciones/${submissionId}/return`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ revision_note: revisionNote.trim() }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin/correcciones");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fallo devolver");
      setReturning(false);
    }
  }

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
            max={100}
            step={1}
            value={score}
            disabled={alreadySent}
            onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
            className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-sm text-foreground"
          />
          <span className="font-inter text-xs text-muted-foreground">/ 100</span>
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
          onClick={() => setReturnModalOpen(true)}
          disabled={alreadySent || submitting || returning}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2.5 font-grotesk text-sm font-semibold text-amber-300 transition hover:bg-amber-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="size-4" /> Devolver para revisión
        </button>
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

      {returnModalOpen && !alreadySent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-amber-400">Devolver al alumno</p>
                <h3 className="mt-1 text-lg font-semibold">Pedile que profundice la tarea</h3>
              </div>
              <button
                onClick={() => { setReturnModalOpen(false); setErr(null); }}
                className="text-muted-foreground hover:text-foreground"
              ><X className="size-5" /></button>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Escribí qué necesita ajustar. Va a recibir un email con tu mensaje y un link para editar su entrega. Cuando re-envíe, vuelve a aparecer acá con el feedback IA nuevo.
            </p>
            <textarea
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              rows={6}
              autoFocus
              placeholder="Ej: Tu diagnóstico de las 8 esferas está incompleto. Sumá las áreas de Trabajo y Tiempo digital, y profundizá en Familia con un ejemplo concreto."
              className="w-full rounded-md border border-border bg-background p-3 text-sm leading-relaxed text-foreground focus:border-brand-violet/60 focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">{revisionNote.trim().length} caracteres (mínimo 10)</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setReturnModalOpen(false); setErr(null); }}
                disabled={returning}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >Cancelar</button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={returning || revisionNote.trim().length < 10}
                className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {returning ? <><Loader2 className="size-4 animate-spin" /> Enviando…</> : <><RotateCcw className="size-4" /> Devolver y notificar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
