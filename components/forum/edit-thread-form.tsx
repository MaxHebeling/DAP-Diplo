"use client";

import { Link } from "@/i18n/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { updateThreadAction } from "@/lib/forum/actions";

const formSchema = z.object({
  title: z.string().trim().min(4, "").max(160),
  body: z.string().trim().min(10, "").max(10000),
  phase_id: z.string().optional().nullable(),
});

type FormValues = z.input<typeof formSchema>;
const NONE = "__none__";

export function EditThreadForm({
  thread,
  phases,
}: {
  thread: {
    id: string;
    title: string;
    body: string;
    phase_id: string | null;
  };
  phases: { id: string; order_index: number; title: string }[];
}) {
  const t = useTranslations("Forum");
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      title: thread.title,
      body: thread.body,
      phase_id: thread.phase_id ?? NONE,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = form;

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("id", thread.id);
    fd.set("title", values.title);
    fd.set("body", values.body);
    fd.set(
      "phase_id",
      values.phase_id && values.phase_id !== NONE ? values.phase_id : "",
    );
    startTransition(async () => {
      const res = await updateThreadAction(undefined, fd);
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl border bg-card p-6"
      noValidate
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">{t("editThread.titleLabel")}</FieldLabel>
          <Input id="title" {...register("title")} />
          {errors.title && (
            <FieldError>
              {errors.title.message || t("editThread.validation.minTitle")}
            </FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="phase_id">
            {t("editThread.phaseLabel")}
          </FieldLabel>
          <Controller
            control={control}
            name="phase_id"
            render={({ field }) => (
              <Select
                value={field.value ?? NONE}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="phase_id">
                  <SelectValue placeholder={t("editThread.phasePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("editThread.noPhase")}</SelectItem>
                  {phases.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {t("editThread.phaseOption", {
                        number: String(b.order_index).padStart(2, "0"),
                        title: b.title,
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="body">{t("editThread.bodyLabel")}</FieldLabel>
          <Controller
            control={control}
            name="body"
            render={({ field }) => (
              <MarkdownEditor
                id="body"
                value={field.value ?? ""}
                onChange={(v) =>
                  setValue("body", v, { shouldDirty: true })
                }
              />
            )}
          />
          {errors.body && (
            <FieldError>
              {errors.body.message || t("editThread.validation.minBody")}
            </FieldError>
          )}
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          render={<Link href={`/comunidad/${thread.id}`} />}
        >
          {t("editThread.cancel")}
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          <Save className="size-4" />
          {pending ? t("editThread.saving") : t("editThread.save")}
        </Button>
      </div>
    </form>
  );
}
