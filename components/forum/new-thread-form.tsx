"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { createThreadAction } from "@/lib/forum/actions";

const formSchema = z.object({
  title: z.string().trim().min(4, "Mínimo 4 caracteres").max(160),
  body: z.string().trim().min(10, "Cuenta un poco más").max(10000),
  phase_id: z.string().optional().nullable(),
});

type FormValues = z.input<typeof formSchema>;

const NONE = "__none__";

export function NewThreadForm({
  phases,
}: {
  phases: { id: string; order_index: number; title: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: { title: "", body: "", phase_id: NONE },
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form;

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("title", values.title);
    fd.set("body", values.body);
    fd.set(
      "phase_id",
      values.phase_id && values.phase_id !== NONE ? values.phase_id : "",
    );
    startTransition(async () => {
      const res = await createThreadAction(undefined, fd);
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
          <FieldLabel htmlFor="title">Título</FieldLabel>
          <Input
            id="title"
            placeholder="¿Sobre qué quieres conversar?"
            {...register("title")}
          />
          {errors.title && <FieldError>{errors.title.message}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="phase_id">
            Fase relacionado (opcional)
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
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin fase específico</SelectItem>
                  {phases.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Fase {String(b.order_index).padStart(2, "0")} ·{" "}
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="body">Cuerpo (Markdown)</FieldLabel>
          <Controller
            control={control}
            name="body"
            render={({ field }) => (
              <MarkdownEditor
                id="body"
                value={field.value ?? ""}
                onChange={(v) =>
                  setValue("body", v, { shouldDirty: true, shouldValidate: false })
                }
                placeholder="Escribe en Markdown. Encabezados, listas, **negrita**, _itálica_, [enlaces](url)..."
              />
            )}
          />
          {errors.body && <FieldError>{errors.body.message}</FieldError>}
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" render={<Link href="/comunidad" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Publicando…" : "Publicar hilo"}
        </Button>
      </div>
    </form>
  );
}
