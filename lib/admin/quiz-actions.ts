"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  questionDeleteSchema,
  questionSaveSchema,
  quizUpdateSchema,
  type QuestionSaveInput,
  type QuizUpdateInput,
} from "@/lib/admin/quiz-schemas";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { admin: false as const, supabase };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return { admin: profile?.role === "admin", supabase };
}

function revalidateSectionPath(
  phaseId: string,
  moduleId: string,
  sectionId: string,
) {
  revalidatePath(
    `/admin/fases/${phaseId}/modulos/${moduleId}/secciones/${sectionId}/editar`,
  );
}

export async function updateQuizAction(
  input: QuizUpdateInput,
  ctx: { phaseId: string; moduleId: string; sectionId: string },
): Promise<ActionResult> {
  const parsed = quizUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { admin, supabase } = await ensureAdmin();
  if (!admin) return { ok: false, error: "Solo admin puede editar quizzes." };

  const { id, ...rest } = parsed.data;
  const { error } = await supabase.from("quizzes").update(rest).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateSectionPath(ctx.phaseId, ctx.moduleId, ctx.sectionId);
  return { ok: true };
}

export async function saveQuestionAction(
  input: QuestionSaveInput,
  ctx: { phaseId: string; moduleId: string; sectionId: string },
): Promise<ActionResult> {
  const parsed = questionSaveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { admin, supabase } = await ensureAdmin();
  if (!admin)
    return { ok: false, error: "Solo admin puede editar preguntas." };

  const { id, quiz_id, kind, payload, prompt, explanation, order_index } =
    parsed.data;
  const row = { quiz_id, kind, payload, prompt, explanation, order_index };

  if (id) {
    const { error } = await supabase
      .from("quiz_questions")
      .update(row)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("quiz_questions").insert(row);
    if (error) return { ok: false, error: error.message };
  }

  revalidateSectionPath(ctx.phaseId, ctx.moduleId, ctx.sectionId);
  return { ok: true };
}

export async function deleteQuestionAction(
  input: z.input<typeof questionDeleteSchema>,
  ctx: { phaseId: string; moduleId: string; sectionId: string },
): Promise<ActionResult> {
  const parsed = questionDeleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Validación falló" };
  }
  const { admin, supabase } = await ensureAdmin();
  if (!admin)
    return { ok: false, error: "Solo admin puede borrar preguntas." };

  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidateSectionPath(ctx.phaseId, ctx.moduleId, ctx.sectionId);
  return { ok: true };
}
