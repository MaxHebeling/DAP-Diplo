"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.object({ id: z.uuid() });

export async function createConversationAction(): Promise<{
  ok: true;
  id: string;
} | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, title: null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "fail" };

  revalidatePath("/tutor");
  return { ok: true, id: data.id };
}

export async function newConversationRedirectAction(): Promise<never> {
  const res = await createConversationAction();
  if (!res.ok) {
    redirect(`/tutor?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/tutor/${res.id}`);
}

export async function deleteConversationAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "ID inválido" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  // RLS de ai_conversations: self → solo borra si user_id = auth.uid()
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/tutor");
  return { ok: true };
}
