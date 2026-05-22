"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/module/markdown";
import { submitAssignmentAction } from "@/lib/assignments/actions";

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
  return (
    <div className="space-y-6">
      {consignaMd && (
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Consigna de la activación
          </p>
          <Markdown>{consignaMd}</Markdown>
        </div>
      )}

      {!submission && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            La entrega se habilita cuando estás en la semana de este módulo.
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
  const router = useRouter();
  const [text, setText] = useState(submission.content_text ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 20) {
      toast.error("Tu entrega es muy corta. Escribí al menos 20 caracteres.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("submissionId", submission.id);
      fd.set("contentText", text.trim());
      const res = await submitAssignmentAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Entrega recibida.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
            Tu entrega
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-300">
            <Clock className="size-3" />
            Cierra el {formatDateTime(submission.closes_at)}
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Escribe tu activación aquí. Tómalo en serio — el Dr. Max va a corregir tu entrega y te va a devolver feedback personal en 48 horas."
          className="w-full resize-y rounded-md border border-white/[0.08] bg-white/[0.04] p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{text.trim().length} caracteres</span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3 text-brand-coral" />
            Corrección con voz del Dr. Max
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || text.trim().length < 20}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Send className="size-4" />
              Entregar
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
  const eta = submission.submitted_at
    ? new Date(
        new Date(submission.submitted_at).getTime() + 48 * 60 * 60 * 1000,
      )
    : null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-8 text-center">
      <Clock className="mx-auto size-9 text-amber-400" strokeWidth={1.7} />
      <h3 className="mt-4 font-serif text-xl font-semibold">
        El Dr. Max está revisando tu entrega
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Tu corrección llega en <strong>48 horas</strong> desde tu envío. Te
        avisamos por email apenas esté lista.
      </p>
      {eta && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Disponible aproximadamente:</span>
          <span className="font-medium text-amber-200">
            {formatDateTime(eta.toISOString())}
          </span>
        </p>
      )}
      {submission.content_text && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Ver lo que entregaste
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
              {passed ? "Activación aprobada" : "Necesita revisión"}
            </p>
            <p className="font-serif text-2xl font-semibold leading-tight">
              {submission.ai_score ?? "—"}
              <span className="text-base text-muted-foreground">/100</span>
            </p>
          </div>
          <p className="ml-auto text-xs text-muted-foreground">
            Corregido el{" "}
            {submission.corrected_at &&
              formatDateTime(submission.corrected_at)}
          </p>
        </div>
      </div>

      {submission.ai_feedback && (
        <div className="rounded-xl border bg-card p-6">
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            <Sparkles className="size-3" />
            Palabra del Dr. Max
          </p>
          <Markdown>{submission.ai_feedback}</Markdown>
        </div>
      )}

      {submission.content_text && (
        <details className="rounded-xl border bg-card/40 p-5">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground">
            Tu entrega original
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
  return (
    <div className="rounded-2xl border border-muted-foreground/20 bg-muted/[0.04] p-8 text-center">
      <Clock className="mx-auto size-9 text-muted-foreground" strokeWidth={1.7} />
      <h3 className="mt-4 font-serif text-lg font-semibold">
        La ventana de entrega cerró
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        No completaste esta activación dentro de la semana
        ({formatDateTime(submission.opens_at)} → {formatDateTime(submission.closes_at)}).
        El contenido sigue accesible para repaso. Para certificarte del
        bloque vas a necesitar volver a abrir esta tarea — contactá al
        equipo si quieres ponerte al día.
      </p>
    </div>
  );
}
