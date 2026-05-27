"use client";

import { useState } from "react";
import MuxUploader from "@mux/mux-uploader-react";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

type Status =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "processing" }
  | { phase: "error"; message: string };

export function MuxSectionUploader({
  sectionId,
  hasExistingVideo,
}: {
  sectionId: string;
  // Misma prop por compat — Mux trata audio igual que video internamente.
  // Renombrada conceptualmente: "ya existe asset en la sección".
  hasExistingVideo: boolean;
}) {
  const [status, setStatus] = useState<Status>({ phase: "idle" });

  // Mux Uploader llama a esta función para obtener el upload URL.
  // Aquí pegamos uploadId a la sección (server) y devolvemos uploadUrl al uploader.
  async function fetchEndpoint(): Promise<string> {
    const res = await fetch("/api/mux/create-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { uploadUrl: string };
    return data.uploadUrl;
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Subir video a Mux</p>
          <p className="text-xs text-muted-foreground">
            {hasExistingVideo
              ? "Ya hay un video asociado. Subir otro lo reemplazará cuando termine el procesamiento."
              : "Arrastra un archivo de video (MP4, MOV, WEBM) o haz click para seleccionarlo. Se sube directo a Mux."}
          </p>
        </div>
        {status.phase === "processing" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-brand-coral">
            <Loader2 className="size-3.5 animate-spin" />
            Procesando…
          </span>
        )}
        {hasExistingVideo && status.phase === "idle" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="size-3.5" />
            Video activo
          </span>
        )}
      </div>

      <MuxUploader
        endpoint={fetchEndpoint}
        onUploadStart={() => setStatus({ phase: "uploading", progress: 0 })}
        onProgress={(e) => {
          const detail = (e as CustomEvent<number>).detail;
          if (typeof detail === "number") {
            setStatus({ phase: "uploading", progress: Math.round(detail) });
          }
        }}
        onSuccess={() => {
          setStatus({ phase: "processing" });
          toast.success(
            "Video subido. Mux está procesando — la sección se actualiza sola en 1-3 minutos.",
          );
        }}
        onUploadError={(e) => {
          const detail = (e as CustomEvent<{ message?: string }>).detail;
          const msg =
            detail?.message ?? "Error subiendo a Mux. Intenta de nuevo.";
          setStatus({ phase: "error", message: msg });
          toast.error(msg);
        }}
        style={
          {
            // Variables expuestas por mux-uploader-react.
            ["--progress-bar-fill-color"]: "var(--color-brand-coral)",
          } as React.CSSProperties
        }
      >
        <div slot="file-select" className="cursor-pointer">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-brand-coral hover:text-brand-coral-foreground hover:border-brand-coral transition-colors"
          >
            <UploadCloud className="size-4" />
            Elegir video…
          </button>
        </div>
      </MuxUploader>

      {status.phase === "error" && (
        <p className="text-xs text-red-500">⚠ {status.message}</p>
      )}
    </div>
  );
}
