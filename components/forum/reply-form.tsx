"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { createPostAction } from "@/lib/forum/actions";

const formSchema = z.object({
  body: z.string().trim().min(2, "Mínimo 2 caracteres").max(10000),
});

type FormValues = z.input<typeof formSchema>;

export function ReplyForm({ threadId }: { threadId: string }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: { body: "" },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("thread_id", threadId);
    fd.set("body", values.body);

    startTransition(async () => {
      const res = await createPostAction(undefined, fd);
      if (res && !res.ok) {
        toast.error(res.error);
        if (res.fieldErrors) {
          for (const [key, msgs] of Object.entries(res.fieldErrors)) {
            if (msgs && msgs[0]) {
              form.setError(key as keyof FormValues, { message: msgs[0] });
            }
          }
        }
      } else {
        // El redirect del action limpia el form via navigation; aún así
        // limpiamos por si la navigation es a la misma URL.
        reset({ body: "" });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border bg-card p-5"
      noValidate
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reply_body">Tu respuesta</FieldLabel>
          <Textarea
            id="reply_body"
            rows={5}
            placeholder="Markdown soportado. Sé constructivo: este foro es un espacio pastoral."
            {...register("body")}
          />
          {errors.body && <FieldError>{errors.body.message}</FieldError>}
        </Field>
      </FieldGroup>
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          <Send className="size-4" />
          {pending ? "Publicando…" : "Publicar respuesta"}
        </Button>
      </div>
    </form>
  );
}
