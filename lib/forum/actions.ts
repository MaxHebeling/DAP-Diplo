"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  postCreateSchema,
  threadCloseSchema,
  threadCreateSchema,
  threadUpdateSchema,
} from "@/lib/forum/schemas";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// =====================================================================
// THREAD
// =====================================================================

export async function createThreadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = threadCreateSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    block_id: formData.get("block_id") || null,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data, error } = await supabase
    .from("forum_threads")
    .insert({
      author_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      block_id: parsed.data.block_id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/comunidad");
  redirect(`/comunidad/${data.id}`);
}

export async function updateThreadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = threadUpdateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    body: formData.get("body"),
    block_id: formData.get("block_id") || null,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  // RLS: forum_threads UPDATE = author OR admin
  const { id, ...rest } = parsed.data;
  const { error } = await supabase
    .from("forum_threads")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${id}`);
  redirect(`/comunidad/${id}?toast=thread-saved`);
}

export async function closeThreadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = threadCloseSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Hilo inválido" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("forum_threads")
    .update({ closed: true, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${parsed.data.id}`);
  redirect(`/comunidad?toast=thread-closed`);
}

// =====================================================================
// POST (reply)
// =====================================================================

export async function createPostAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = postCreateSchema.safeParse({
    thread_id: formData.get("thread_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  // Verifica que el hilo no esté cerrado (RLS ya filtra por suscripción)
  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, closed")
    .eq("id", parsed.data.thread_id)
    .maybeSingle();
  if (!thread) return { ok: false, error: "Hilo no encontrado" };
  if (thread.closed) {
    return { ok: false, error: "Este hilo está cerrado. No se aceptan más respuestas." };
  }

  const { error } = await supabase.from("forum_posts").insert({
    thread_id: parsed.data.thread_id,
    author_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };

  // El trigger trg_forum_posts_bump_thread bumpea automáticamente
  // forum_threads.updated_at del thread padre (bypass RLS via SECURITY
  // DEFINER), así que el listado se reordena solo.

  revalidatePath("/comunidad");
  revalidatePath(`/comunidad/${parsed.data.thread_id}`);
  redirect(`/comunidad/${parsed.data.thread_id}?toast=post-created`);
}
