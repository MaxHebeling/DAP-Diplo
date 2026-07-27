"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { ExternalLink, Save, Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { MuxSectionUploader } from "@/components/admin/mux-section-uploader";
import { updateSectionAction } from "@/lib/admin/actions";

const formSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body_md: z.string().trim().max(20000).nullable(),
  mux_playback_id: z.string().trim().max(80).nullable(),
  duration_seconds: z.number().int().min(0).max(36000).nullable(),
  poster_url: z.string().trim().max(2000).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export type SectionFormSection = {
  id: string;
  module_id: string;
  phase_id: string;
  kind: "intro" | "teaching" | "activation" | "evaluation" | "impartation";
  title: string;
  body_md: string | null;
  mux_playback_id: string | null;
  duration_seconds: number | null;
  poster_url: string | null;
};

const KIND_LABEL_KEY: Record<SectionFormSection["kind"], string> = {
  intro: "kindIntro",
  teaching: "kindTeaching",
  activation: "kindActivation",
  evaluation: "kindEvaluation",
  impartation: "kindImpartation",
};

export function SectionEditForm({
  section,
}: {
  section: SectionFormSection;
}) {
  const t = useTranslations("AdminUI");
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      title: section.title,
      body_md: section.body_md ?? "",
      mux_playback_id: section.mux_playback_id ?? "",
      duration_seconds: section.duration_seconds,
      poster_url: section.poster_url ?? "",
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = form;

  const isTeaching = section.kind === "teaching";
  // useWatch en vez de form.watch — compatible con React Compiler.
  const body = useWatch({ control, name: "body_md" }) ?? "";
  const posterUrl = useWatch({ control, name: "poster_url" }) ?? "";

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("id", section.id);
    fd.set("phaseId", section.phase_id);
    fd.set("moduleId", section.module_id);
    fd.set("title", values.title);
    fd.set("body_md", values.body_md ?? "");
    fd.set("mux_playback_id", values.mux_playback_id ?? "");
    fd.set(
      "duration_seconds",
      values.duration_seconds !== null ? String(values.duration_seconds) : "",
    );
    fd.set("poster_url", values.poster_url ?? "");

    startTransition(async () => {
      const res = await updateSectionAction(undefined, fd);
      if (res && !res.ok) {
        toast.error(res.error);
        if (res.fieldErrors) {
          for (const [key, msgs] of Object.entries(res.fieldErrors)) {
            if (msgs && msgs[0]) {
              form.setError(key as keyof FormValues, { message: msgs[0] });
            }
          }
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" noValidate>
      <section className="rounded-xl border bg-card p-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-brand-coral">
          {t("sectionEdit.sectionEyebrow", {
            kind: t(`sectionEdit.${KIND_LABEL_KEY[section.kind]}`),
          })}
        </p>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">{t("sectionEdit.titleLabel")}</FieldLabel>
            <Input id="title" {...register("title")} />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="body_md">
              {t("sectionEdit.bodyLabel")}
            </FieldLabel>
            <Controller
              control={control}
              name="body_md"
              render={({ field }) => (
                <MarkdownEditor
                  id="body_md"
                  value={field.value ?? ""}
                  onChange={(v) =>
                    setValue("body_md", v, { shouldDirty: true })
                  }
                  placeholder={
                    section.kind === "impartation"
                      ? t("sectionEdit.impartationPlaceholder")
                      : t("sectionEdit.bodyPlaceholder")
                  }
                />
              )}
            />
            {errors.body_md && (
              <FieldError>{errors.body_md.message}</FieldError>
            )}
            <p className="text-xs text-muted-foreground">
              {t("sectionEdit.charCount", { count: body.length.toLocaleString() })}
            </p>
          </Field>

          {isTeaching && (
            <>
              <MuxSectionUploader
                sectionId={section.id}
                hasExistingVideo={Boolean(section.mux_playback_id)}
              />

              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Field>
                  <FieldLabel htmlFor="mux_playback_id">
                    {t("sectionEdit.muxPlaybackIdLabel")}
                  </FieldLabel>
                  <Input
                    id="mux_playback_id"
                    {...register("mux_playback_id")}
                    placeholder={t("sectionEdit.muxPlaybackIdPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("sectionEdit.muxPlaybackIdHint")}{" "}
                    <a
                      href="https://dashboard.mux.com/video/assets"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-coral hover:underline"
                    >
                      {t("sectionEdit.openMuxDashboard")}
                      <ExternalLink className="size-3" />
                    </a>
                  </p>
                  {errors.mux_playback_id && (
                    <FieldError>{errors.mux_playback_id.message}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="duration_seconds">
                    {t("sectionEdit.durationLabel")}
                  </FieldLabel>
                  <Input
                    id="duration_seconds"
                    type="number"
                    min={0}
                    max={36000}
                    {...register("duration_seconds", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined
                          ? null
                          : Number(v),
                    })}
                  />
                  {errors.duration_seconds && (
                    <FieldError>{errors.duration_seconds.message}</FieldError>
                  )}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="poster_url">Portada (thumbnail)</FieldLabel>
                <PosterUploader
                  sectionId={section.id}
                  currentUrl={posterUrl}
                  onChange={(url) =>
                    setValue("poster_url", url, { shouldDirty: true })
                  }
                />
                {/* URL hidden field para que entre al form normal */}
                <input type="hidden" {...register("poster_url")} />
                {errors.poster_url && (
                  <FieldError>{errors.poster_url.message}</FieldError>
                )}
              </Field>
            </>
          )}
        </FieldGroup>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          render={
            <Link
              href={`/admin/fases/${section.phase_id}/modulos/${section.module_id}/secciones`}
            />
          }
        >
          {t("sectionEdit.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          <Save className="size-4" />
          {pending ? t("sectionEdit.saving") : t("sectionEdit.saveSection")}
        </Button>
      </div>
    </form>
  );
}

function PosterUploader({
  sectionId,
  currentUrl,
  onChange,
}: {
  sectionId: string;
  currentUrl: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Estado interno para preview instantánea — evita depender del re-render
  // del form padre (useWatch puede tardar un frame en propagarse).
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  // Si el form padre cambia el valor externamente (reset, etc.), sincronizamos
  useEffect(() => { setPreviewUrl(currentUrl); }, [currentUrl]);

  async function handleFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Solo JPG / PNG / WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5 MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("sectionId", sectionId);
      const res = await fetch("/api/admin/upload-section-poster", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPreviewUrl(data.url);   // preview INMEDIATA
      onChange(data.url);        // y sincroniza form
      toast.success("Portada subida. No olvides hacer click en 'Guardar sección'.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falló la subida");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function clearPoster() {
    setPreviewUrl("");
    onChange("");
  }

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-border bg-muted/20">
          {/* <img> normal (no next/image) — más confiable con URLs externas
              dinámicas y sin requerir whitelisting extra del dominio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Portada" className="absolute inset-0 size-full object-cover" />
          <button
            type="button"
            onClick={clearPoster}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-red-500/90 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600"
          >
            <X className="size-3" /> Quitar
          </button>
        </div>
      ) : (
        <div className="flex aspect-video w-full max-w-md items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground">
          <div className="text-center">
            <ImageIcon className="mx-auto size-10 opacity-40" />
            <p className="mt-2 text-xs">Sin portada — Mux genera un thumb automático</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Subiendo…" : previewUrl ? "Cambiar portada" : "Subir portada"}
        </Button>
        <p className="text-xs text-muted-foreground">JPG / PNG / WEBP · máx 5 MB · 16:9 ideal</p>
      </div>
    </div>
  );
}
