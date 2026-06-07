"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  liveSessionCreateSchema,
  liveSessionDeleteSchema,
  liveSessionUpdateSchema,
} from "@/lib/live-sessions/schemas";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function rawFromFormData(formData: FormData) {
  return {
    kind: formData.get("kind"),
    title: formData.get("title"),
    description: formData.get("description"),
    scheduled_at: formData.get("scheduled_at"),
    duration_minutes: formData.get("duration_minutes"),
    meeting_url: formData.get("meeting_url"),
    host_name: formData.get("host_name"),
    phase_id: formData.get("phase_id") || null,
  };
}

export async function createLiveSessionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = liveSessionCreateSchema.safeParse(rawFromFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const { error, data } = await supabase
    .from("live_sessions")
    .insert({
      ...parsed.data,
      scheduled_at: parsed.data.scheduled_at.toISOString(),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Broadcast a suscriptores activos (fire-and-forget — no bloqueamos
  // el redirect del admin). El cron de recordatorio (1h antes) cubre
  // a quien no abra este primer aviso.
  try {
    const { broadcastLiveSessionAnnouncement } = await import(
      "@/lib/email/send-live-session-announcement"
    );
    void broadcastLiveSessionAnnouncement({
      id: data.id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      scheduledAt: parsed.data.scheduled_at,
      hostName: parsed.data.host_name ?? null,
    }).catch((err) => {
      console.error("[live-announcement] broadcast falló:", err);
    });
  } catch (err) {
    console.error("[live-announcement] import falló:", err);
  }

  revalidatePath("/admin/en-vivo");
  redirect(`/admin/en-vivo?toast=live-created&focus=${data.id}`);
}

export async function updateLiveSessionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = liveSessionUpdateSchema.safeParse({
    id: formData.get("id"),
    ...rawFromFormData(formData),
    recording_url: formData.get("recording_url"),
    recording_mux_playback_id: formData.get("recording_mux_playback_id"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const { id, ...rest } = parsed.data;
  const { error } = await supabase
    .from("live_sessions")
    .update({
      ...rest,
      scheduled_at: rest.scheduled_at.toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/en-vivo");
  revalidatePath(`/admin/en-vivo/${id}/editar`);
  redirect(`/admin/en-vivo?toast=live-saved&focus=${id}`);
}

export async function deleteLiveSessionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = liveSessionDeleteSchema.safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) return { ok: false, error: "Sesión inválida." };

  const { admin, supabase } = await requireAdmin();
  if (!admin) return { ok: false, error: "Solo admin." };

  const { error } = await supabase
    .from("live_sessions")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/en-vivo");
  return { ok: true };
}
