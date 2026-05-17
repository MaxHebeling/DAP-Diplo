import { z } from "zod";

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

// =====================================================================
// MODULE
// =====================================================================

export const moduleUpdateSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(2).max(160),
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
  objective: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  main_revelation: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  impartation_phrase: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  duration_minutes: z.coerce.number().int().min(1).max(180).nullable(),
  is_free_preview: z.coerce.boolean(),
});

// =====================================================================
// MODULE SECTION
// =====================================================================

export const sectionUpdateSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  body_md: z
    .string()
    .trim()
    .max(20000)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  mux_playback_id: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  duration_seconds: z.coerce.number().int().min(0).max(36000).nullable(),
});
