"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Plus, Save, Trash2, X } from "lucide-react";
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
import {
  deleteQuestionAction,
  saveQuestionAction,
} from "@/lib/admin/quiz-actions";

export type QuestionRow = {
  id: string;
  quiz_id: string;
  prompt: string;
  kind: "multiple_choice" | "true_false";
  payload: unknown;
  explanation: string | null;
  order_index: number;
};

type Ctx = { phaseId: string; moduleId: string; sectionId: string };

const formSchema = z
  .object({
    prompt: z.string().trim().min(2, "promptMin").max(2000),
    kind: z.enum(["multiple_choice", "true_false"]),
    explanation: z.string().trim().max(2000),
    order_index: z.coerce.number().int().min(0).max(999),

    // multiple_choice fields
    options: z.array(z.string()).default([""]),
    correct_index: z.coerce.number().int().min(0).default(0),

    // true_false field
    tf_correct: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.kind === "multiple_choice") {
      const cleaned = d.options.map((o) => o.trim()).filter((o) => o.length > 0);
      if (cleaned.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "needTwoOptions",
        });
      }
      if (cleaned.length > 6) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "maxSixOptions",
        });
      }
      if (d.correct_index >= cleaned.length) {
        ctx.addIssue({
          code: "custom",
          path: ["correct_index"],
          message: "correctIndexInvalid",
        });
      }
    }
  });

type FormValues = z.input<typeof formSchema>;

function parsePayload(kind: QuestionRow["kind"], payload: unknown) {
  if (kind === "multiple_choice") {
    const p = payload as {
      options?: unknown;
      correct_index?: unknown;
    } | null;
    const options = Array.isArray(p?.options)
      ? (p!.options as unknown[]).map((s) => String(s))
      : ["", ""];
    const correct_index =
      typeof p?.correct_index === "number" ? p!.correct_index : 0;
    return { options, correct_index, tf_correct: true };
  }
  // true_false
  const p = payload as { correct?: unknown } | null;
  const tf_correct = typeof p?.correct === "boolean" ? p!.correct : true;
  return { options: ["", ""], correct_index: 0, tf_correct };
}

export function QuizQuestionForm({
  quizId,
  question,
  ctx,
  defaultOrderIndex,
  onSaved,
  onCancel,
}: {
  quizId: string;
  question: QuestionRow | null;
  ctx: Ctx;
  defaultOrderIndex: number;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("AdminUI");
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  // Resuelve los mensajes de validación que vienen como key del schema Zod.
  const questionErrorKeys = new Set([
    "promptMin",
    "needTwoOptions",
    "maxSixOptions",
    "correctIndexInvalid",
  ]);
  const fieldError = (msg: string | undefined): string | undefined =>
    msg && questionErrorKeys.has(msg) ? t(`quizQuestion.${msg}`) : msg;

  const parsed = question
    ? parsePayload(question.kind, question.payload)
    : { options: ["", "", "", ""], correct_index: 0, tf_correct: true };

  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      prompt: question?.prompt ?? "",
      kind: question?.kind ?? "multiple_choice",
      explanation: question?.explanation ?? "",
      order_index: question?.order_index ?? defaultOrderIndex,
      options: parsed.options,
      correct_index: parsed.correct_index,
      tf_correct: parsed.tf_correct,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = form;
  // useWatch en vez de form.watch para suscripciones reactivas
  // (compatible con React Compiler). getValues para reads imperativos
  // dentro de event handlers.
  const kind = useWatch({ control, name: "kind" });
  const options = useWatch({ control, name: "options" }) ?? [];

  function addOption() {
    if (options.length >= 6) return;
    setValue("options", [...options, ""], { shouldDirty: true });
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== idx);
    setValue("options", next, { shouldDirty: true });
    const cur = Number(getValues("correct_index") ?? 0) || 0;
    if (cur >= next.length) {
      setValue("correct_index", Math.max(0, next.length - 1), {
        shouldDirty: true,
      });
    } else if (cur > idx) {
      setValue("correct_index", cur - 1, { shouldDirty: true });
    }
  }

  function onSubmit(values: FormValues) {
    const payload =
      values.kind === "multiple_choice"
        ? {
            options: (values.options ?? [])
              .map((o) => o.trim())
              .filter((o) => o.length > 0),
            correct_index: Number(values.correct_index ?? 0) || 0,
          }
        : { correct: Boolean(values.tf_correct) };

    startTransition(async () => {
      const res = await saveQuestionAction(
        {
          id: question?.id ?? null,
          quiz_id: quizId,
          prompt: values.prompt,
          kind: values.kind,
          explanation: values.explanation,
          order_index: Number(values.order_index) || 0,
          payload: payload as never,
        },
        ctx,
      );
      if (res.ok) {
        toast.success(
          question ? t("quizQuestion.questionUpdated") : t("quizQuestion.questionAdded"),
        );
        onSaved();
      } else {
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
    if (!question) return;
    if (!confirm(t("quizQuestion.deleteConfirm"))) return;
    startDelete(async () => {
      const res = await deleteQuestionAction(
        { id: question.id, quiz_id: quizId },
        ctx,
      );
      if (res.ok) {
        toast.success(t("quizQuestion.questionDeleted"));
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border bg-muted/20 p-4 space-y-4"
      noValidate
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="prompt">{t("quizQuestion.promptLabel")}</FieldLabel>
          <Textarea
            id="prompt"
            rows={2}
            {...register("prompt")}
            placeholder={t("quizQuestion.promptPlaceholder")}
          />
          {errors.prompt && <FieldError>{fieldError(errors.prompt.message)}</FieldError>}
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field>
            <FieldLabel htmlFor="kind">{t("quizQuestion.kindLabel")}</FieldLabel>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">
                      {t("quizQuestion.multipleChoice")}
                    </SelectItem>
                    <SelectItem value="true_false">
                      {t("quizQuestion.trueFalse")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="order_index">{t("quizQuestion.orderLabel")}</FieldLabel>
            <Input
              id="order_index"
              type="number"
              min={0}
              max={999}
              {...register("order_index")}
            />
          </Field>
        </div>

        {kind === "multiple_choice" && (
          <Field>
            <FieldLabel>{t("quizQuestion.optionsLabel")}</FieldLabel>
            <p className="text-xs text-muted-foreground">
              {t("quizQuestion.optionsHint")}
            </p>
            <div className="space-y-2">
              {options.map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="correct_index"
                    render={({ field }) => (
                      <input
                        type="radio"
                        checked={Number(field.value) === idx}
                        onChange={() => field.onChange(idx)}
                        className="size-4 accent-brand-coral"
                        aria-label={t("quizQuestion.markCorrectAria", { index: idx + 1 })}
                      />
                    )}
                  />
                  <Input
                    {...register(`options.${idx}` as const)}
                    placeholder={t("quizQuestion.optionPlaceholder", { index: idx + 1 })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(idx)}
                    aria-label={t("quizQuestion.removeOptionAria")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {errors.options && (
                <FieldError>
                  {fieldError((errors.options as { message?: string }).message)}
                </FieldError>
              )}
              {errors.correct_index && (
                <FieldError>{fieldError(errors.correct_index.message)}</FieldError>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={options.length >= 6}
              >
                <Plus className="size-3.5" />
                {t("quizQuestion.addOption")}
              </Button>
            </div>
          </Field>
        )}

        {kind === "true_false" && (
          <Field>
            <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div>
                <FieldLabel htmlFor="tf_correct">
                  {t("quizQuestion.correctAnswerLabel")}
                </FieldLabel>
                <p className="text-xs text-muted-foreground">
                  {t("quizQuestion.trueFalseHint")}
                </p>
              </div>
              <Controller
                control={control}
                name="tf_correct"
                render={({ field }) => (
                  <Switch
                    id="tf_correct"
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="explanation">
            {t("quizQuestion.explanationLabel")}
          </FieldLabel>
          <Textarea
            id="explanation"
            rows={2}
            {...register("explanation")}
            placeholder={t("quizQuestion.explanationPlaceholder")}
          />
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-between gap-2">
        <div>
          {question && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
            >
              <Trash2 className="size-3.5" />
              {deleting ? t("quizQuestion.deleting") : t("quizQuestion.delete")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={pending}
            >
              {t("quizQuestion.cancel")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            <Save className="size-3.5" />
            {pending
              ? t("quizQuestion.saving")
              : question
                ? t("quizQuestion.saveChanges")
                : t("quizQuestion.addQuestion")}
          </Button>
        </div>
      </div>
    </form>
  );
}
