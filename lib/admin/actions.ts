"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const blockUpdateSchema = z.object({
  id: z.uuid(),
  order_index: z.coerce.number().int().min(1).max(9),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones."),
  title: z.string().trim().min(2).max(120),
  subtitle: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z
    .string()
    .trim()
    .max(4000)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  cover_image_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .nullable()
    .or(z.literal("").transform(() => null)),
  months_duration: z.coerce.number().int().min(1).max(12),
  rank_id: z.uuid().nullable().or(z.literal("").transform(() => null)),
  published: z.coerce.boolean(),
});

export type BlockUpdateInput = z.input<typeof blockUpdateSchema>;
export type BlockUpdateResult =
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
  _prev: BlockUpdateResult | undefined,
  formData: FormData,
): Promise<BlockUpdateResult> {
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
