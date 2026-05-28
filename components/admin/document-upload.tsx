"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Phase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "ingesting"; storagePath: string }
  | {
      kind: "done";
      result: { chunks_count: number; tokens_used: number; total_chars: number };
    }
  | { kind: "error"; message: string };

export function DocumentUpload() {
  const t = useTranslations("AdminUI");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error(t("documentUpload.selectPdfFirst"));
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error(t("documentUpload.onlyPdfs"));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(t("documentUpload.maxSize"));
      return;
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) {
      toast.error(t("documentUpload.needTitle"));
      return;
    }

    setPhase({ kind: "uploading" });

    // 1) Sube a Storage directamente desde el browser (RLS admin permite read,
    //    el write usa la sesión del admin via supabase-js auto-auth con cookie).
    //    Como las writes del bucket están bloqueadas para todos (solo service
    //    role), tenemos que subir via un endpoint server. Pero más simple:
    //    usamos un signed upload URL del server. Aún más simple: pasamos
    //    el archivo en un POST multipart.
    //
    //    Simplest path: el endpoint /api/admin/tutor/ingest acepta el File
    //    en multipart y hace todo (upload a Storage + parse + embed). Pero
    //    cambiamos el contrato del endpoint a un FormData.
    //
    //    Otra alternativa: signed upload URL. Vamos por esa, más limpio.
    const supabase = createClient();
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const storagePath = `${Date.now()}-${safeName}`;

    // Generamos signed upload URL via RPC o via supabase.storage. El cliente
    // anon NO puede generarla (necesita service role). Lo hacemos via un
    // endpoint pequeño /api/admin/tutor/upload-url.
    const urlRes = await fetch("/api/admin/tutor/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: storagePath }),
    });
    if (!urlRes.ok) {
      const body = await urlRes.json().catch(() => ({}));
      setPhase({
        kind: "error",
        message: body.error ?? t("documentUpload.couldNotStartUpload"),
      });
      return;
    }
    const { token } = (await urlRes.json()) as { token: string };

    const { error: uploadErr } = await supabase.storage
      .from("ai-documents")
      .uploadToSignedUrl(storagePath, token, file, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadErr) {
      setPhase({ kind: "error", message: uploadErr.message });
      return;
    }

    // 2) Dispara ingest
    setPhase({ kind: "ingesting", storagePath });
    const ingestRes = await fetch("/api/admin/tutor/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storagePath, sourceTitle: cleanTitle }),
    });
    const ingestBody = await ingestRes.json().catch(() => ({}));
    if (!ingestRes.ok) {
      setPhase({
        kind: "error",
        message: ingestBody.error ?? `HTTP ${ingestRes.status}`,
      });
      return;
    }

    setPhase({
      kind: "done",
      result: {
        chunks_count: ingestBody.chunks_count,
        tokens_used: ingestBody.tokens_used,
        total_chars: ingestBody.total_chars,
      },
    });
    toast.success(
      t("documentUpload.ingested", {
        chunks: ingestBody.chunks_count,
        tokens: ingestBody.tokens_used,
      }),
    );
    setFile(null);
    setTitle("");
    startTransition(() => router.refresh());
  }

  const isBusy = phase.kind === "uploading" || phase.kind === "ingesting";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field>
        <FieldLabel htmlFor="title">{t("documentUpload.titleLabel")}</FieldLabel>
        <Input
          id="title"
          placeholder={t("documentUpload.titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isBusy}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="pdf">{t("documentUpload.pdfLabel")}</FieldLabel>
        <Input
          id="pdf"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={isBusy}
        />
      </Field>

      <div className="flex items-center justify-between gap-3">
        <PhaseIndicator phase={phase} />
        <Button type="submit" disabled={isBusy || !file || title.length < 2}>
          {phase.kind === "uploading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />{" "}
              {t("documentUpload.uploadingPdf")}
            </>
          ) : phase.kind === "ingesting" ? (
            <>
              <Loader2 className="size-4 animate-spin" />{" "}
              {t("documentUpload.chunkingEmbedding")}
            </>
          ) : (
            <>
              <UploadCloud className="size-4" />{" "}
              {t("documentUpload.uploadAndIngest")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function PhaseIndicator({ phase }: { phase: Phase }) {
  const t = useTranslations("AdminUI");
  if (phase.kind === "idle") return null;
  if (phase.kind === "done") {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-emerald-600">
        <CheckCircle2 className="size-3.5" />
        {t("documentUpload.chunksTokens", {
          chunks: phase.result.chunks_count,
          tokens: phase.result.tokens_used.toLocaleString(),
        })}
      </div>
    );
  }
  if (phase.kind === "error") {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-red-500">
        <XCircle className="size-3.5" />
        {phase.message}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      {phase.kind === "uploading"
        ? t("documentUpload.uploadingToStorage")
        : t("documentUpload.processingWithVoyage")}
    </div>
  );
}
