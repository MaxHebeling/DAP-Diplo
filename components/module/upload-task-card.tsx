"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";
import { uploadAssignmentAttachmentAction } from "@/lib/assignments/actions";

/**
 * Card "Subir mi tarea" — técnica idéntica a test #2 (verificada en Safari):
 * <label> con <input style={{display:"none"}}> adentro. Click en cualquier
 * parte del label → browser abre el picker nativamente.
 */
export function UploadTaskCard({
  phaseSlug,
  moduleSlug,
  alreadySubmitted,
  openSubmissionId,
  label,
  description,
  taskTypeLabel,
}: {
  phaseSlug: string;
  moduleSlug: string;
  alreadySubmitted: boolean;
  openSubmissionId: string | null;
  label: string;
  description: string;
  taskTypeLabel: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const cardClass = `group flex items-start gap-3 rounded-xl border p-4 transition-all ${
    alreadySubmitted
      ? "border-emerald-400/30 bg-emerald-400/[0.06] hover:border-emerald-400/50"
      : "border-brand-coral/30 bg-brand-coral/[0.08] hover:border-brand-coral/60 hover:bg-brand-coral/[0.12]"
  } ${uploading ? "opacity-70" : "cursor-pointer"}`;

  const inner = (
    <>
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
          alreadySubmitted
            ? "bg-emerald-400/20 text-emerald-400"
            : "bg-brand-coral/20 text-brand-coral"
        }`}
      >
        {uploading ? <Loader2 className="size-5 animate-spin" /> : <FilePlus2 className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`font-inter text-[10px] font-bold uppercase tracking-[0.28em] ${
            alreadySubmitted ? "text-emerald-400" : "text-brand-coral"
          }`}
        >
          {taskTypeLabel}
        </p>
        <p className="mt-1 font-grotesk text-sm font-bold text-text-primary sm:text-base">
          {uploading ? "Subiendo…" : label}
        </p>
        <p className="mt-0.5 font-inter text-xs text-text-secondary">{description}</p>
      </div>
    </>
  );

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !openSubmissionId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("submissionId", openSubmissionId);
      fd.set("file", file);
      const res = await uploadAssignmentAttachmentAction(fd);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Adjunto subido: ${res.filename}. Te llevo al form para confirmar el envío.`);
      router.push(`/fases/${phaseSlug}/modulos/${moduleSlug}?section=activation#upload-form`);
      router.refresh();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // CASO PRINCIPAL: técnica del test #3 verificada (input file invisible
  // cubriendo todo el card con inline styles, sin display:none). Safari
  // captura el click directo en el input nativo. NO uso label/htmlFor
  // porque el audit detectó que Safari falla con label+display:none cuando
  // el label tiene markup anidado complejo.
  if (openSubmissionId && !alreadySubmitted) {
    return (
      <div
        className={cardClass}
        data-upload-card="v3-overlay"
        data-submission-id={openSubmissionId}
        style={{ position: "relative" }}
      >
        {inner}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.odt,.txt,.rtf,.jpg,.jpeg,.png,image/*"
          onChange={handleFile}
          disabled={uploading}
          aria-label={label}
          title={label}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            zIndex: 10,
            // CRITICAL: padding y border en 0 para que cubra exactamente el card
            padding: 0,
            margin: 0,
            border: 0,
            // Quitar el styling default del file input que en algunos browsers
            // limita el click area a una zona específica
            fontSize: 0,
          }}
        />
      </div>
    );
  }

  // FALLBACK: ya entregó o no hay submission → Link clásico
  return (
    <Link
      href={`/fases/${phaseSlug}/modulos/${moduleSlug}?section=activation`}
      className={cardClass}
      data-upload-card="v3-fallback-link"
      data-already-submitted={String(alreadySubmitted)}
      data-has-open-id={String(!!openSubmissionId)}
    >
      {inner}
    </Link>
  );
}
