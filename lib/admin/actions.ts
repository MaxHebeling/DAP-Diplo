"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
    return { ok: false, error: "Solo admin puede editar bloques." };
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
    rank_id,
    published,
  } = parsed.data;

  const { error } = await supabase
    .from("blocks")
    .update({
      order_index,
      slug,
      title,
      subtitle,
      description,
      cover_image_url,
      months_duration,
      rank_id,
      published,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  // Revalida páginas que dependen de bloques
  revalidatePath("/");
  revalidatePath(`/bloques/${slug}`);
  revalidatePath("/admin/bloques");
  revalidatePath(`/admin/bloques/${id}/editar`);

  redirect("/admin/bloques?toast=block-saved");
}

// =====================================================================
// MODULE
// =====================================================================

export async function updateModuleAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const blockId = (raw.blockId as string) ?? "";
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
  revalidatePath("/admin/bloques");
  if (blockId) {
    revalidatePath(`/admin/bloques/${blockId}/modulos`);
    revalidatePath(`/admin/bloques/${blockId}/modulos/${id}/editar`);
  }

  redirect(
    `/admin/bloques/${blockId}/modulos/${id}/editar?toast=module-saved`,
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
  const blockId = (raw.blockId as string) ?? "";
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
  const { error } = await supabase
    .from("module_sections")
    .update(rest)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Revalida páginas dependientes
  if (blockId && moduleId) {
    revalidatePath(
      `/admin/bloques/${blockId}/modulos/${moduleId}/secciones`,
    );
    revalidatePath(
      `/admin/bloques/${blockId}/modulos/${moduleId}/secciones/${id}/editar`,
    );
  }

  redirect(
    `/admin/bloques/${blockId}/modulos/${moduleId}/secciones?toast=section-saved`,
  );
}

