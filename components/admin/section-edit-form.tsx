"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { ExternalLink, Save } from "lucide-react";
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
  title_en: z.string().trim().max(120).nullable(),
  body_md_en: z.string().trim().max(20000).nullable(),
  mux_playback_id: z.string().trim().max(80).nullable(),
  duration_seconds: z.number().int().min(0).max(36000).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export type SectionFormSection = {
  id: string;
  module_id: string;
  phase_id: string;
  kind: "intro" | "teaching" | "activation" | "evaluation" | "impartation";
  title: string;
  body_md: string | null;
  title_en: string | null;
  body_md_en: string | null;
  mux_playback_id: string | null;
  duration_seconds: number | null;
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
      title_en: section.title_en ?? "",
      body_md_en: section.body_md_en ?? "",
      mux_playback_id: section.mux_playback_id ?? "",
      duration_seconds: section.duration_seconds,
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
  const bodyEn = useWatch({ control, name: "body_md_en" }) ?? "";

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("id", section.id);
    fd.set("phaseId", section.phase_id);
    fd.set("moduleId", section.module_id);
    fd.set("title", values.title);
    fd.set("body_md", values.body_md ?? "");
    fd.set("title_en", values.title_en ?? "");
    fd.set("body_md_en", values.body_md_en ?? "");
    fd.set("mux_playback_id", values.mux_playback_id ?? "");
    fd.set(
      "duration_seconds",
      values.duration_seconds !== null ? String(values.duration_seconds) : "",
    );

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
            <FieldLabel htmlFor="title_en">Título (inglés)</FieldLabel>
            <Input id="title_en" {...register("title_en")} />
            <p className="text-xs text-muted-foreground">
              Opcional — si lo dejas vacío, se muestra el español.
            </p>
            {errors.title_en && (
              <FieldError>{errors.title_en.message}</FieldError>
            )}
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

          <Field>
            <FieldLabel htmlFor="body_md_en">Cuerpo (inglés)</FieldLabel>
            <Controller
              control={control}
              name="body_md_en"
              render={({ field }) => (
                <MarkdownEditor
                  id="body_md_en"
                  value={field.value ?? ""}
                  onChange={(v) =>
                    setValue("body_md_en", v, { shouldDirty: true })
                  }
                  placeholder={
                    section.kind === "impartation"
                      ? t("sectionEdit.impartationPlaceholder")
                      : t("sectionEdit.bodyPlaceholder")
                  }
                />
              )}
            />
            {errors.body_md_en && (
              <FieldError>{errors.body_md_en.message}</FieldError>
            )}
            <p className="text-xs text-muted-foreground">
              Opcional — si lo dejas vacío, se muestra el español.{" "}
              {t("sectionEdit.charCount", {
                count: bodyEn.length.toLocaleString(),
              })}
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
