"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { muxClient } from "@/lib/mux/server";
import {
  blockUpdateSchema,
  moduleUpdateSchema,
  sectionUpdateSchema,
} from "@/lib/admin/schemas";

// Tipo definido inline porque "use server" prohíbe exports no-async.
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

export async function updateBlockAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  // FormData representa booleanos como "on"/"" o ausentes; normalizar.
  const parsed = blockUpdateSchema.safeParse({
    ...raw,
    published: raw.published === "true" || raw.published === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { admin, supabase } = await ensureAdmin();
  if (!admin) {
    return { ok: false, error: "Solo admin puede editar fases." };
  }

  const {
    id,
    order_index,
    slug,
    title,
    subtitle,
    description,
    cover_image_url,
    months_duration,
    dimension_id,
    published,
  } = parsed.data;

  const { error } = await supabase
    .from("phases")
    .update({
      order_index,
      slug,
      title,
      subtitle,
      description,
      cover_image_url,
      months_duration,
      dimension_id,
      published,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  // Revalida páginas que dependen de fases
  revalidatePath("/");
  revalidatePath(`/fases/${slug}`);
  revalidatePath("/admin/fases");
  revalidatePath(`/admin/fases/${id}/editar`);

  redirect("/admin/fases?toast=phase-saved");
}

// =====================================================================
// MODULE
// =====================================================================

export async function updateModuleAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const phaseId = (raw.phaseId as string) ?? "";
  const parsed = moduleUpdateSchema.safeParse({
    ...raw,
    is_free_preview:
      raw.is_free_preview === "true" || raw.is_free_preview === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { admin, supabase } = await ensureAdmin();
  if (!admin) return { ok: false, error: "Solo admin puede editar módulos." };

  const { id, ...rest } = parsed.data;
  const { error } = await supabase.from("modules").update(rest).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Revalida páginas dependientes
  revalidatePath("/admin/fases");
  if (phaseId) {
    revalidatePath(`/admin/fases/${phaseId}/modulos`);
    revalidatePath(`/admin/fases/${phaseId}/modulos/${id}/editar`);
  }

  redirect(
    `/admin/fases/${phaseId}/modulos/${id}/editar?toast=module-saved`,
  );
}

// =====================================================================
// MODULE SECTION
// =====================================================================

export async function updateSectionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const phaseId = (raw.phaseId as string) ?? "";
  const moduleId = (raw.moduleId as string) ?? "";
  const parsed = sectionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validación falló",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { admin, supabase } = await ensureAdmin();
  if (!admin) return { ok: false, error: "Solo admin puede editar secciones." };

  const { id, ...rest } = parsed.data;

  // Si el admin está PEGANDO un mux_playback_id manualmente (vs el flow
  // de upload que lo setea via webhook), validamos contra Mux para que
  // no quede persistido un ID inválido o de otra cuenta. Sólo cuando
  // cambia: re-grabar el mismo valor no consume API calls.
  if (rest.mux_playback_id) {
    const { data: existing } = await supabase
      .from("module_sections")
      .select("mux_playback_id")
      .eq("id", id)
      .maybeSingle<{ mux_playback_id: string | null }>();
    if (rest.mux_playback_id !== existing?.mux_playback_id) {
      try {
        await muxClient().video.playbackIds.retrieve(rest.mux_playback_id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "no encontrado";
        return {
          ok: false,
          error: `playback_id no válido en Mux (${msg.slice(0, 80)})`,
          fieldErrors: {
            mux_playback_id: ["No existe en tu cuenta de Mux"],
          },
        };
      }
    }
  }

  const { error } = await supabase
    .from("module_sections")
    .update(rest)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Revalida páginas dependientes
  if (phaseId && moduleId) {
    revalidatePath(
      `/admin/fases/${phaseId}/modulos/${moduleId}/secciones`,
    );
    revalidatePath(
      `/admin/fases/${phaseId}/modulos/${moduleId}/secciones/${id}/editar`,
    );
  }

  redirect(
    `/admin/fases/${phaseId}/modulos/${moduleId}/secciones?toast=section-saved`,
  );
}

