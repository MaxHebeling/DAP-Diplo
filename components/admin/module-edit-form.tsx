"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateModuleAction } from "@/lib/admin/actions";

const formSchema = z.object({
  title: z.string().trim().min(2).max(160),
  subtitle: z.string().trim().max(200).nullable(),
  description: z.string().trim().max(4000).nullable(),
  objective: z.string().trim().max(500).nullable(),
  main_revelation: z.string().trim().max(500).nullable(),
  impartation_phrase: z.string().trim().max(500).nullable(),
  title_en: z.string().trim().max(160).nullable(),
  subtitle_en: z.string().trim().max(200).nullable(),
  description_en: z.string().trim().max(4000).nullable(),
  objective_en: z.string().trim().max(500).nullable(),
  main_revelation_en: z.string().trim().max(500).nullable(),
  impartation_phrase_en: z.string().trim().max(500).nullable(),
  duration_minutes: z.number().int().min(1).max(180).nullable(),
  is_free_preview: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export type ModuleFormModule = {
  id: string;
  phase_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  objective: string | null;
  main_revelation: string | null;
  impartation_phrase: string | null;
  title_en: string | null;
  subtitle_en: string | null;
  description_en: string | null;
  objective_en: string | null;
  main_revelation_en: string | null;
  impartation_phrase_en: string | null;
  duration_minutes: number | null;
  is_free_preview: boolean;
};

export function ModuleEditForm({ mod }: { mod: ModuleFormModule }) {
  const t = useTranslations("AdminUI");
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      title: mod.title,
      subtitle: mod.subtitle ?? "",
      description: mod.description ?? "",
      objective: mod.objective ?? "",
      main_revelation: mod.main_revelation ?? "",
      impartation_phrase: mod.impartation_phrase ?? "",
      title_en: mod.title_en ?? "",
      subtitle_en: mod.subtitle_en ?? "",
      description_en: mod.description_en ?? "",
      objective_en: mod.objective_en ?? "",
      main_revelation_en: mod.main_revelation_en ?? "",
      impartation_phrase_en: mod.impartation_phrase_en ?? "",
      duration_minutes: mod.duration_minutes,
      is_free_preview: mod.is_free_preview,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = form;

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("id", mod.id);
    fd.set("phaseId", mod.phase_id);
    fd.set("title", values.title);
    fd.set("subtitle", values.subtitle ?? "");
    fd.set("description", values.description ?? "");
    fd.set("objective", values.objective ?? "");
    fd.set("main_revelation", values.main_revelation ?? "");
    fd.set("impartation_phrase", values.impartation_phrase ?? "");
    fd.set("title_en", values.title_en ?? "");
    fd.set("subtitle_en", values.subtitle_en ?? "");
    fd.set("description_en", values.description_en ?? "");
    fd.set("objective_en", values.objective_en ?? "");
    fd.set("main_revelation_en", values.main_revelation_en ?? "");
    fd.set("impartation_phrase_en", values.impartation_phrase_en ?? "");
    fd.set(
      "duration_minutes",
      values.duration_minutes !== null ? String(values.duration_minutes) : "",
    );
    fd.set("is_free_preview", values.is_free_preview ? "true" : "false");

    startTransition(async () => {
      const res = await updateModuleAction(undefined, fd);
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
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {t("moduleEdit.identityHeading")}
        </h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="title">{t("moduleEdit.titleLabel")}</FieldLabel>
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
            <FieldLabel htmlFor="subtitle">{t("moduleEdit.subtitleLabel")}</FieldLabel>
            <Input id="subtitle" {...register("subtitle")} />
            {errors.subtitle && (
              <FieldError>{errors.subtitle.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="subtitle_en">Subtítulo (inglés)</FieldLabel>
            <Input id="subtitle_en" {...register("subtitle_en")} />
            <p className="text-xs text-muted-foreground">
              Opcional — si lo dejas vacío, se muestra el español.
            </p>
            {errors.subtitle_en && (
              <FieldError>{errors.subtitle_en.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="description">
              {t("moduleEdit.descriptionLabel")}
            </FieldLabel>
            <Textarea
              id="description"
              rows={5}
              className="font-mono text-sm"
              {...register("description")}
            />
            {errors.description && (
              <FieldError>{errors.description.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="description_en">Descripción (inglés)</FieldLabel>
            <Textarea
              id="description_en"
              rows={5}
              className="font-mono text-sm"
              {...register("description_en")}
            />
            <p className="text-xs text-muted-foreground">
              Opcional — si lo dejas vacío, se muestra el español.
            </p>
            {errors.description_en && (
              <FieldError>{errors.description_en.message}</FieldError>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="duration_minutes">
                {t("moduleEdit.durationLabel")}
              </FieldLabel>
              <Input
                id="duration_minutes"
                type="number"
                min={1}
                max={180}
                {...register("duration_minutes", {
                  setValueAs: (v) =>
                    v === "" || v === null || v === undefined
                      ? null
                      : Number(v),
                })}
              />
              {errors.duration_minutes && (
                <FieldError>{errors.duration_minutes.message}</FieldError>
              )}
            </Field>
            <Field>
              <div className="flex h-full items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                <div>
                  <FieldLabel htmlFor="is_free_preview">
                    {t("moduleEdit.freePreviewLabel")}
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    {t("moduleEdit.freePreviewHint")}
                  </p>
                </div>
                <Controller
                  control={control}
                  name="is_free_preview"
                  render={({ field }) => (
                    <Switch
                      id="is_free_preview"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </Field>
          </div>
        </FieldGroup>
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {t("moduleEdit.apostolicHeading")}
        </h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="objective">{t("moduleEdit.objectiveLabel")}</FieldLabel>
            <Textarea
              id="objective"
              rows={2}
              {...register("objective")}
              placeholder={t("moduleEdit.objectivePlaceholder")}
            />
            {errors.objective && (
              <FieldError>{errors.objective.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="objective_en">Objetivo (inglés)</FieldLabel>
            <Textarea id="objective_en" rows={2} {...register("objective_en")} />
            <p className="text-xs text-muted-foreground">
              Opcional — si lo dejas vacío, se muestra el español.
            </p>
            {errors.objective_en && (
              <FieldError>{errors.objective_en.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="main_revelation">
              {t("moduleEdit.revelationLabel")}
            </FieldLabel>
            <Textarea
              id="main_revelation"
              rows={2}
              {...register("main_revelation")}
              placeholder={t("moduleEdit.revelationPlaceholder")}
            />
            {errors.main_revelation && (
              <FieldError>{errors.main_revelation.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="main_revelation_en">
              Revelación principal (inglés)
            </FieldLabel>
            <Textarea
              id="main_revelation_en"
              rows={2}
              {...register("main_revelation_en")}
            />
            <p className="text-xs text-muted-foreground">
              Opcional — si lo dejas vacío, se muestra el español.
            </p>
            {errors.main_revelation_en && (
              <FieldError>{errors.main_revelation_en.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="impartation_phrase">
              {t("moduleEdit.impartationLabel")}
            </FieldLabel>
            <Textarea
              id="impartation_phrase"
              rows={3}
              {...register("impartation_phrase")}
              placeholder={t("moduleEdit.impartationPlaceholder")}
            />
            {errors.impartation_phrase && (
              <FieldError>{errors.impartation_phrase.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="impartation_phrase_en">
              Frase de impartición (inglés)
            </FieldLabel>
            <Textarea
              id="impartation_phrase_en"
              rows={3}
              {...register("impartation_phrase_en")}
            />
            <p className="text-xs text-muted-foreground">
              Opcional — si lo dejas vacío, se muestra el español.
            </p>
            {errors.impartation_phrase_en && (
              <FieldError>{errors.impartation_phrase_en.message}</FieldError>
            )}
          </Field>
        </FieldGroup>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          render={
            <Link href={`/admin/fases/${mod.phase_id}/modulos`} />
          }
        >
          {t("moduleEdit.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          <Save className="size-4" />
          {pending ? t("moduleEdit.saving") : t("moduleEdit.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
