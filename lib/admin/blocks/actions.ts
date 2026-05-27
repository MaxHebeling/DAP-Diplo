"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type BlockUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

const updateSchema = z.object({
  slug: z.string().min(1).max(120),
  brandName: z
    .string()
    .trim()
    .max(80)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  title: z.string().trim().min(2).max(200),
  subtitle: z
    .string()
    .trim()
    .max(400)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  promise: z
    .string()
    .trim()
    .max(600)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  coverImageUrl: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  brandNameEn: z
    .string()
    .trim()
    .max(80)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  titleEn: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  subtitleEn: z
    .string()
    .trim()
    .max(400)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  promiseEn: z
    .string()
    .trim()
    .max(600)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  descriptionEn: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  published: z.boolean(),
});

/**
 * Edita un bloque. Actualiza blocks Y phases (mismo slug) para mantener
 * la divergencia histórica sincronizada. Auth: admin only via layout.
 */
export async function updateBlockAction(
  formData: FormData,
): Promise<BlockUpdateResult> {
  const parsed = updateSchema.safeParse({
    slug: formData.get("slug"),
    brandName: formData.get("brandName") ?? "",
    title: formData.get("title"),
    subtitle: formData.get("subtitle") ?? "",
    promise: formData.get("promise") ?? "",
    description: formData.get("description") ?? "",
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    brandNameEn: formData.get("brandNameEn") ?? "",
    titleEn: formData.get("titleEn") ?? "",
    subtitleEn: formData.get("subtitleEn") ?? "",
    promiseEn: formData.get("promiseEn") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profile?.role !== "admin") return { ok: false, error: "Solo admin" };

  const payload = {
    brand_name: parsed.data.brandName ?? null,
    title: parsed.data.title,
    subtitle: parsed.data.subtitle ?? null,
    promise: parsed.data.promise ?? null,
    description: parsed.data.description ?? null,
    cover_image_url: parsed.data.coverImageUrl ?? null,
    brand_name_en: parsed.data.brandNameEn ?? null,
    title_en: parsed.data.titleEn ?? null,
    subtitle_en: parsed.data.subtitleEn ?? null,
    promise_en: parsed.data.promiseEn ?? null,
    description_en: parsed.data.descriptionEn ?? null,
    published: parsed.data.published,
    updated_at: new Date().toISOString(),
  };

  // Actualizar tanto blocks como phases (sincronía vía slug)
  const [{ error: bErr }, { error: pErr }] = await Promise.all([
    supabase.from("blocks").update(payload).eq("slug", parsed.data.slug),
    supabase.from("phases").update(payload).eq("slug", parsed.data.slug),
  ]);

  if (bErr) return { ok: false, error: `blocks: ${bErr.message}` };
  if (pErr) return { ok: false, error: `phases: ${pErr.message}` };

  // Revalidar todas las páginas que muestran este bloque
  revalidatePath("/");
  revalidatePath("/fases");
  revalidatePath(`/fases/${parsed.data.slug}`);
  revalidatePath("/admin/bloques");
  revalidatePath(`/admin/bloques/${parsed.data.slug}`);

  return { ok: true };
}
