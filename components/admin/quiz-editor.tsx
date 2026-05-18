"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  QuizQuestionForm,
  type QuestionRow,
} from "@/components/admin/quiz-question-form";
import { updateQuizAction } from "@/lib/admin/quiz-actions";

export type QuizRow = {
  id: string;
  module_section_id: string;
  title: string;
  description: string | null;
  pass_threshold: number;
  max_attempts: number | null;
  shuffle_questions: boolean;
};

type Ctx = { phaseId: string; moduleId: string; sectionId: string };

const quizFormSchema = z.object({
  title: z.string().trim().min(1, "Requerido").max(160),
  description: z.string().trim().max(2000),
  pass_threshold: z.coerce.number().int().min(0).max(100),
  max_attempts: z.coerce.number().int().min(1).max(50).nullable(),
  shuffle_questions: z.boolean(),
});

type QuizFormValues = z.input<typeof quizFormSchema>;

function questionSummary(q: QuestionRow): string {
  if (q.kind === "true_false") {
    const correct = (q.payload as { correct?: boolean })?.correct;
    return `V/F · Correcta: ${correct ? "Verdadero" : "Falso"}`;
  }
  const opts = (q.payload as { options?: string[] })?.options ?? [];
  return `Opción múltiple · ${opts.length} opciones`;
}

export function QuizEditor({
  quiz,
  questions,
  ctx,
}: {
  quiz: QuizRow;
  questions: QuestionRow[];
  ctx: Ctx;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const form = useForm<QuizFormValues>({
    resolver: standardSchemaResolver(quizFormSchema),
    defaultValues: {
      title: quiz.title,
      description: quiz.description ?? "",
      pass_threshold: quiz.pass_threshold,
      max_attempts: quiz.max_attempts,
      shuffle_questions: quiz.shuffle_questions,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = form;

  function onSubmitMeta(values: QuizFormValues) {
    startTransition(async () => {
      const res = await updateQuizAction(
        {
          id: quiz.id,
          title: values.title,
          description: values.description,
          pass_threshold: Number(values.pass_threshold) || 0,
          max_attempts:
            values.max_attempts === null ||
            values.max_attempts === undefined ||
            (values.max_attempts as unknown as string) === ""
              ? null
              : Number(values.max_attempts),
          shuffle_questions: Boolean(values.shuffle_questions),
        },
        ctx,
      );
      if (res.ok) {
        toast.success("Quiz guardado.");
        form.reset(values);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function refreshAfterMutation() {
    setEditingId(null);
    setAdding(false);
    router.refresh();
  }

  const nextOrderIndex =
    questions.length > 0
      ? Math.max(...questions.map((q) => q.order_index)) + 1
      : 0;

  return (
    <div className="space-y-8">
      {/* META */}
      <form
        onSubmit={handleSubmit(onSubmitMeta)}
        className="rounded-xl border bg-card p-6 space-y-5"
        noValidate
      >
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Quiz de evaluación
          </p>
          <h2 className="font-serif text-2xl font-semibold">Configuración</h2>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="quiz_title">Título del quiz</FieldLabel>
            <Input id="quiz_title" {...register("title")} />
            {errors.title && <FieldError>{errors.title.message}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="quiz_description">
              Descripción (opcional)
            </FieldLabel>
            <Textarea
              id="quiz_description"
              rows={2}
              {...register("description")}
              placeholder="Instrucciones breves para el alumno."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="pass_threshold">
                Umbral aprobatorio (%)
              </FieldLabel>
              <Input
                id="pass_threshold"
                type="number"
                min={0}
                max={100}
                {...register("pass_threshold")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="max_attempts">
                Intentos máx (vacío = ∞)
              </FieldLabel>
              <Input
                id="max_attempts"
                type="number"
                min={1}
                max={50}
                {...register("max_attempts", {
                  setValueAs: (v) =>
                    v === "" || v === null || v === undefined
                      ? null
                      : Number(v),
                })}
              />
            </Field>
            <Field>
              <div className="flex h-full items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                <div>
                  <FieldLabel htmlFor="shuffle_questions">
                    Mezclar preguntas
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    Orden aleatorio por alumno.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="shuffle_questions"
                  render={({ field }) => (
                    <Switch
                      id="shuffle_questions"
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </Field>
          </div>
        </FieldGroup>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !isDirty}>
            <Save className="size-4" />
            {pending ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      </form>

      {/* PREGUNTAS */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-brand-coral">
              Banco de preguntas
            </p>
            <h2 className="font-serif text-2xl font-semibold">
              {questions.length}{" "}
              {questions.length === 1 ? "pregunta" : "preguntas"}
            </h2>
          </div>
          {!adding && (
            <Button
              size="sm"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
            >
              <Plus className="size-4" />
              Agregar pregunta
            </Button>
          )}
        </div>

        {questions.length === 0 && !adding && (
          <p className="rounded-lg border border-dashed bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            Todavía no hay preguntas. Agrega la primera.
          </p>
        )}

        <ul className="space-y-3">
          {questions.map((q) => (
            <li key={q.id}>
              {editingId === q.id ? (
                <QuizQuestionForm
                  quizId={quiz.id}
                  question={q}
                  ctx={ctx}
                  defaultOrderIndex={q.order_index}
                  onSaved={refreshAfterMutation}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-4 rounded-lg border bg-card px-4 py-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-brand-coral text-xs font-medium text-brand-coral-foreground tabular-nums">
                      {q.order_index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug truncate">
                        {q.prompt}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="font-normal">
                          {questionSummary(q)}
                        </Badge>
                        {q.explanation && (
                          <span className="text-xs text-muted-foreground">
                            · con explicación
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(q.id);
                      setAdding(false);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {adding && (
          <QuizQuestionForm
            quizId={quiz.id}
            question={null}
            ctx={ctx}
            defaultOrderIndex={nextOrderIndex}
            onSaved={refreshAfterMutation}
            onCancel={() => setAdding(false)}
          />
        )}
      </section>
    </div>
  );
}
