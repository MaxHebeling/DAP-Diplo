"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
// zodResolver (de "@hookform/resolvers/zod") espera Zod v3; usamos
// standardSchemaResolver porque Zod v4 implementa la spec Standard Schema.
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CoverUpload } from "@/components/admin/cover-upload";
import { updateBlockAction } from "@/lib/admin/actions";

const formSchema = z.object({
  // valueAsNumber en register() → llega number, no string
  order_index: z.number().int().min(1).max(9),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones."),
  title: z.string().trim().min(2, "Mínimo 2 caracteres.").max(120),
  subtitle: z.string().trim().max(200).nullable(),
  description: z.string().trim().max(4000).nullable(),
  cover_image_url: z.string().trim().nullable(),
  months_duration: z.number().int().min(1).max(12),
  rank_id: z.uuid().nullable(),
  published: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export type BlockFormBlock = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  months_duration: number;
  rank_id: string | null;
  published: boolean;
};

type Rank = { id: string; order_index: number; name: string };

export function BlockEditForm({
  block,
  ranks,
}: {
  block: BlockFormBlock;
  ranks: Rank[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      order_index: block.order_index,
      slug: block.slug,
      title: block.title,
      subtitle: block.subtitle ?? "",
      description: block.description ?? "",
      cover_image_url: block.cover_image_url ?? null,
      months_duration: block.months_duration,
      rank_id: block.rank_id,
      published: block.published,
    },
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = form;

  const cover = watch("cover_image_url");

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("id", block.id);
    fd.set("order_index", String(values.order_index));
    fd.set("slug", values.slug);
    fd.set("title", values.title);
    fd.set("subtitle", values.subtitle ?? "");
    fd.set("description", values.description ?? "");
    fd.set("cover_image_url", values.cover_image_url ?? "");
    fd.set("months_duration", String(values.months_duration));
    fd.set("rank_id", values.rank_id ?? "");
    fd.set("published", values.published ? "true" : "false");

    startTransition(async () => {
      const res = await updateBlockAction(undefined, fd);
      // updateBlockAction redirige al final si OK; res solo viene si error.
      if (res && !res.ok) {
        toast.error(res.error);
        if (res.fieldErrors) {
          for (const [key, msgs] of Object.entries(res.fieldErrors)) {
            if (msgs && msgs[0]) {
              form.setError(key as keyof FormValues, {
                message: msgs[0],
              });
            }
          }
        }
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-10"
      noValidate
    >
      {/* COVER */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Portada
        </h2>
        <CoverUpload
          value={cover}
          onChange={(url) =>
            setValue("cover_image_url", url, { shouldDirty: true })
          }
          blockId={block.id}
        />
      </section>

      {/* IDENTIDAD */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Identidad
        </h2>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="order_index">Posición (1-9)</FieldLabel>
              <Input
                id="order_index"
                type="number"
                min={1}
                max={9}
                {...register("order_index", { valueAsNumber: true })}
              />
              {errors.order_index && (
                <FieldError>{errors.order_index.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="months_duration">
                Duración (meses)
              </FieldLabel>
              <Input
                id="months_duration"
                type="number"
                min={1}
                max={12}
                {...register("months_duration", { valueAsNumber: true })}
              />
              {errors.months_duration && (
                <FieldError>{errors.months_duration.message}</FieldError>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="slug">Slug</FieldLabel>
            <Input id="slug" {...register("slug")} />
            <p className="text-xs text-muted-foreground">
              URL final: <code>/bloques/{watch("slug")}</code>
            </p>
            {errors.slug && <FieldError>{errors.slug.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="title">Título</FieldLabel>
            <Input id="title" {...register("title")} />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="subtitle">Subtítulo (opcional)</FieldLabel>
            <Input id="subtitle" {...register("subtitle")} />
            {errors.subtitle && (
              <FieldError>{errors.subtitle.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="description">
              Descripción (Markdown, opcional)
            </FieldLabel>
            <Textarea
              id="description"
              rows={8}
              className="font-mono text-sm"
              {...register("description")}
            />
            {errors.description && (
              <FieldError>{errors.description.message}</FieldError>
            )}
          </Field>
        </FieldGroup>
      </section>

      {/* RANGO + PUBLICACIÓN */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Rango y publicación
        </h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="rank_id">
              Rango que se desbloquea al completar
            </FieldLabel>
            <Controller
              control={control}
              name="rank_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) =>
                    field.onChange(v === "none" ? null : v)
                  }
                >
                  <SelectTrigger id="rank_id">
                    <SelectValue placeholder="Selecciona un rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin rango</SelectItem>
                    {ranks.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {String(r.order_index).padStart(2, "0")} · {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3">
              <div className="space-y-0.5">
                <FieldLabel htmlFor="published">Publicado</FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Si está apagado, el bloque solo es visible para admins.
                </p>
              </div>
              <Controller
                control={control}
                name="published"
                render={({ field }) => (
                  <Switch
                    id="published"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </Field>
        </FieldGroup>
      </section>

      {/* SUBMIT */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" render={<Link href="/admin/bloques" />}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !isDirty}>
          <Save className="size-4" />
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
