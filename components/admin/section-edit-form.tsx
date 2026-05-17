"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { updateSectionAction } from "@/lib/admin/actions";

const formSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body_md: z.string().trim().max(20000).nullable(),
  mux_playback_id: z.string().trim().max(80).nullable(),
  duration_seconds: z.number().int().min(0).max(36000).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export type SectionFormSection = {
  id: string;
  module_id: string;
  block_id: string;
  kind: "intro" | "teaching" | "activation" | "evaluation" | "impartation";
  title: string;
  body_md: string | null;
  mux_playback_id: string | null;
  duration_seconds: number | null;
};

const KIND_LABEL: Record<SectionFormSection["kind"], string> = {
  intro: "Introducción",
  teaching: "Enseñanza",
  activation: "Activación",
  evaluation: "Evaluación",
  impartation: "Frase de impartición",
};

export function SectionEditForm({
  section,
}: {
  section: SectionFormSection;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      title: section.title,
      body_md: section.body_md ?? "",
      mux_playback_id: section.mux_playback_id ?? "",
      duration_seconds: section.duration_seconds,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = form;

  const isTeaching = section.kind === "teaching";
  const body = watch("body_md") ?? "";

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("id", section.id);
    fd.set("blockId", section.block_id);
    fd.set("moduleId", section.module_id);
    fd.set("title", values.title);
    fd.set("body_md", values.body_md ?? "");
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
          Sección · {KIND_LABEL[section.kind]}
        </p>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">Título visible</FieldLabel>
            <Input id="title" {...register("title")} />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="body_md">
              Cuerpo (Markdown)
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
                      ? "Texto opcional de cierre. La frase grande viene del campo `impartation_phrase` del módulo."
                      : "Escribe el contenido en Markdown. Soporta encabezados, listas, **negrita**, _itálica_, [enlaces](url), citas, etc."
                  }
                />
              )}
            />
            {errors.body_md && (
              <FieldError>{errors.body_md.message}</FieldError>
            )}
            <p className="text-xs text-muted-foreground">
              {body.length.toLocaleString()} caracteres
            </p>
          </Field>

          {isTeaching && (
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field>
                <FieldLabel htmlFor="mux_playback_id">
                  Mux Playback ID
                </FieldLabel>
                <Input
                  id="mux_playback_id"
                  {...register("mux_playback_id")}
                  placeholder="ej. nVw01YQrLcsRZTpKxw2HmkkAFTQqyLOpRr01TR2..."
                />
                <p className="text-xs text-muted-foreground">
                  Sube el video a Mux y pega aquí el Playback ID.{" "}
                  <a
                    href="https://dashboard.mux.com/video/assets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-coral hover:underline"
                  >
                    Abrir Mux Dashboard
                    <ExternalLink className="size-3" />
                  </a>
                </p>
                {errors.mux_playback_id && (
                  <FieldError>{errors.mux_playback_id.message}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="duration_seconds">
                  Duración (segundos)
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
          )}
        </FieldGroup>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          render={
            <Link
              href={`/admin/bloques/${section.block_id}/modulos/${section.module_id}/secciones`}
            />
          }
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          <Save className="size-4" />
          {pending ? "Guardando…" : "Guardar sección"}
        </Button>
      </div>
    </form>
  );
}
