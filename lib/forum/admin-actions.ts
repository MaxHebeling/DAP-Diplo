"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";

type ActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.object({ id: z.uuid() });

function revalidateForum(threadId?: string) {
  revalidatePath("/comunidad");
  revalidatePath("/admin/comunidad");
  if (threadId) revalidatePath(`/comunidad/${threadId}`);
}

// =====================================================================
// THREAD TOGGLES
// =====================================================================

export async function toggleThreadPinnedAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Hilo inválido" };

  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const { data: cur } = await supabase
    .from("forum_threads")
    .select("pinned")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!cur) return { ok: false, error: "Hilo no encontrado." };

  const { error } = await supabase
    .from("forum_threads")
    .update({ pinned: !cur.pinned })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidateForum(parsed.data.id);
  return { ok: true };
}

export async function toggleThreadClosedAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Hilo inválido" };

  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const { data: cur } = await supabase
    .from("forum_threads")
    .select("closed")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!cur) return { ok: false, error: "Hilo no encontrado." };

  const { error } = await supabase
    .from("forum_threads")
    .update({ closed: !cur.closed })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidateForum(parsed.data.id);
  return { ok: true };
}

export async function toggleThreadHiddenAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Hilo inválido" };

  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const { data: cur } = await supabase
    .from("forum_threads")
    .select("hidden")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!cur) return { ok: false, error: "Hilo no encontrado." };

  const { error } = await supabase
    .from("forum_threads")
    .update({ hidden: !cur.hidden })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidateForum(parsed.data.id);
  return { ok: true };
}

// =====================================================================
// REPORTS
// =====================================================================

export async function resolveReportAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Reporte inválido" };

  const { admin, supabase, userId } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const { error } = await supabase
    .from("forum_reports")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidateForum();
  return { ok: true };
}
