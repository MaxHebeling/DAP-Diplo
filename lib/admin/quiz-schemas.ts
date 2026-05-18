import { z } from "zod";

// =====================================================================
// QUIZ (metadata)
// =====================================================================

export const quizUpdateSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(160),
  description: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  pass_threshold: z.coerce.number().int().min(0).max(100),
  max_attempts: z
    .union([z.coerce.number().int().min(1).max(50), z.null()])
    .nullable(),
  shuffle_questions: z.coerce.boolean(),
});

export type QuizUpdateInput = z.input<typeof quizUpdateSchema>;

// =====================================================================
// QUIZ QUESTION
// =====================================================================

const multipleChoicePayloadSchema = z
  .object({
    options: z
      .array(z.string().trim().min(1).max(300))
      .min(2, "Mínimo 2 opciones")
      .max(6, "Máximo 6 opciones"),
    correct_index: z.number().int().min(0),
  })
  .refine((d) => d.correct_index < d.options.length, {
    message: "El índice correcto debe apuntar a una opción válida",
    path: ["correct_index"],
  });

const trueFalsePayloadSchema = z.object({
  correct: z.boolean(),
});

const baseQuestionFields = {
  quiz_id: z.uuid(),
  id: z.uuid().optional().nullable(),
  prompt: z.string().trim().min(2).max(2000),
  explanation: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  order_index: z.coerce.number().int().min(0).max(999),
};

export const questionSaveSchema = z.discriminatedUnion("kind", [
  z.object({
    ...baseQuestionFields,
    kind: z.literal("multiple_choice"),
    payload: multipleChoicePayloadSchema,
  }),
  z.object({
    ...baseQuestionFields,
    kind: z.literal("true_false"),
    payload: trueFalsePayloadSchema,
  }),
]);

export type QuestionSaveInput = z.input<typeof questionSaveSchema>;

export const questionDeleteSchema = z.object({
  id: z.uuid(),
  quiz_id: z.uuid(),
});
