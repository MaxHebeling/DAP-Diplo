"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Save, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createLiveSessionAction,
  deleteLiveSessionAction,
  updateLiveSessionAction,
} from "@/lib/live-sessions/actions";
import {
  LIVE_KINDS,
  LIVE_KIND_LABEL,
  type LiveKind,
} from "@/lib/live-sessions/schemas";

// Form schema (cliente) — más permisivo en datetime que el server schema:
// usamos el formato local del <input type="datetime-local">.
const formSchema = z.object({
  kind: z.enum(LIVE_KINDS),
  title: z.string().trim().min(4, "Mínimo 4 caracteres").max(160),
  description: z.string().trim().max(4000),
  scheduled_at: z.string().min(10, "Selecciona fecha y hora"),
  duration_minutes: z.coerce.number().int().min(15).max(480),
  meeting_url: z.string().trim().url("URL inválida").max(500),
  host_name: z.string().trim().max(120),
  block_id: z.string().optional().nullable(),
  // Solo en edición:
  recording_url: z.string().trim().max(500).optional(),
  recording_mux_playback_id: z.string().trim().max(80).optional(),
});

type FormValues = z.input<typeof formSchema>;

const NONE = "__none__";

// Convierte un Date / ISO string al formato que pide <input type="datetime-local">
// (YYYY-MM-DDTHH:mm) en la zona horaria LOCAL del browser.
function toDatetimeLocalInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type LiveSessionFormSession = {
  id: string;
  kind: LiveKind;
  title: string;
  description: string | null;
  scheduled_at: string; // ISO
  duration_minutes: number;
  meeting_url: string;
  host_name: string | null;
  block_id: string | null;
  recording_url: string | null;
  recording_mux_playback_id: string | null;
};

type Props = {
  blocks: { id: string; order_index: number; title: string }[];
  session?: LiveSessionFormSession;
};

export function LiveSessionForm({ blocks, session }: Props) {
  const [pending, startTransition] = useTransition();
  const [pendingDelete, startDelete] = useTransition();
  const isEdit = !!session;

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      kind: session?.kind ?? "masterclass",
      title: session?.title ?? "",
      description: session?.description ?? "",
      scheduled_at: toDatetimeLocalInput(session?.scheduled_at),
      duration_minutes: session?.duration_minutes ?? 60,
      meeting_url: session?.meeting_url ?? "",
      host_name: session?.host_name ?? "",
      block_id: session?.block_id ?? NONE,
      recording_url: session?.recording_url ?? "",
      recording_mux_playback_id: session?.recording_mux_playback_id ?? "",
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
    fd.set("kind", values.kind);
    fd.set("title", values.title);
    fd.set("description", values.description);
    fd.set("scheduled_at", values.scheduled_at);
    fd.set("duration_minutes", String(values.duration_minutes));
    fd.set("meeting_url", values.meeting_url);
    fd.set("host_name", values.host_name);
    fd.set(
      "block_id",
      values.block_id && values.block_id !== NONE ? values.block_id : "",
    );
    if (isEdit) {
      fd.set("id", session!.id);
      fd.set("recording_url", values.recording_url ?? "");
      fd.set(
        "recording_mux_playback_id",
        values.recording_mux_playback_id ?? "",
      );
    }

    startTransition(async () => {
      const res = await (isEdit
        ? updateLiveSessionAction(undefined, fd)
        : createLiveSessionAction(undefined, fd));
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

  function onDelete() {
    if (!isEdit) return;
    if (
      !confirm(
        "¿Eliminar esta sesión? Si fue una sesión pasada, también pierdes el link al recording asociado.",
      )
    )
      return;
    const fd = new FormData();
    fd.set("id", session!.id);
    startDelete(async () => {
      const res = await deleteLiveSessionAction(undefined, fd);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Sesión eliminada.");
        window.location.href = "/admin/en-vivo";
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8"
      noValidate
    >
      {/* IDENTIDAD */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Identidad
        </h2>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field>
              <FieldLabel htmlFor="title">Título</FieldLabel>
              <Input
                id="title"
                {...register("title")}
                placeholder="Ej. Activación: Llamado pastoral"
              />
              {errors.title && (
                <FieldError>{errors.title.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="kind">Tipo</FieldLabel>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <SelectTrigger id="kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIVE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {LIVE_KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="description">
              Descripción (opcional)
            </FieldLabel>
            <Textarea
              id="description"
              rows={3}
              {...register("description")}
              placeholder="Resumen breve: qué se trabajará, quién la imparte, expectativa..."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="block_id">
              Bloque relacionado (opcional)
            </FieldLabel>
            <Controller
              control={control}
              name="block_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="block_id">
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin bloque específico</SelectItem>
                    {blocks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        Bloque {String(b.order_index).padStart(2, "0")} ·{" "}
                        {b.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </FieldGroup>
      </section>

      {/* CALENDARIZACIÓN */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Calendarización
        </h2>
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="scheduled_at">
                Fecha y hora (tu zona horaria)
              </FieldLabel>
              <Input
                id="scheduled_at"
                type="datetime-local"
                {...register("scheduled_at")}
              />
              {errors.scheduled_at && (
                <FieldError>{errors.scheduled_at.message}</FieldError>
              )}
              <p className="text-xs text-muted-foreground">
                Se almacena en UTC y se muestra a cada alumno en su zona
                local.
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="duration_minutes">
                Duración (minutos)
              </FieldLabel>
              <Input
                id="duration_minutes"
                type="number"
                min={15}
                max={480}
                {...register("duration_minutes")}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="meeting_url">URL de la reunión</FieldLabel>
            <Input
              id="meeting_url"
              type="url"
              {...register("meeting_url")}
              placeholder="https://zoom.us/j/... o https://meet.google.com/..."
            />
            {errors.meeting_url && (
              <FieldError>{errors.meeting_url.message}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="host_name">Host / Apóstol</FieldLabel>
            <Input
              id="host_name"
              {...register("host_name")}
              placeholder="Ej. Ap. Max Hebeling"
            />
          </Field>
        </FieldGroup>
      </section>

      {/* GRABACIÓN (solo edición) */}
      {isEdit && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Grabación
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Llenar después de que la sesión termine. Si subiste el video a
            Mux, usa el Playback ID (preferido). Si es un link externo
            (YouTube no-listado, Zoom cloud, Drive), usa la URL.
          </p>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field>
                <FieldLabel htmlFor="recording_url">URL externa</FieldLabel>
                <Input
                  id="recording_url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... (opcional)"
                  {...register("recording_url")}
                />
                {errors.recording_url && (
                  <FieldError>{errors.recording_url.message}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="recording_mux_playback_id">
                  Mux Playback ID
                </FieldLabel>
                <Input
                  id="recording_mux_playback_id"
                  placeholder="ej. nVw01YQrLcsRZ..."
                  {...register("recording_mux_playback_id")}
                />
              </Field>
            </div>
          </FieldGroup>
        </section>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          {isEdit && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={pendingDelete}
              className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
            >
              <Trash2 className="size-4" />
              {pendingDelete ? "Eliminando…" : "Eliminar sesión"}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" render={<Link href="/admin/en-vivo" />}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || (isEdit && !isDirty)}>
            <Save className="size-4" />
            {pending
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear sesión"}
          </Button>
        </div>
      </div>
    </form>
  );
}
