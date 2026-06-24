import { z } from "zod";

// =====================================================================
// DUB / TRANSLATION ADMIN ROUTES (CRON_SECRET-gated)
// =====================================================================

// Idiomas soportados por el pipeline de doblado/traducción.
const dubLang = z.enum(["en", "pt", "fr", "de"]);

export const dubChunksSchema = z.object({
  sectionId: z.uuid(),
  targetLang: dubLang.default("en"),
  chunkIndex: z.coerce.number().int().min(0),
});

export const finalizeDubSchema = z.object({
  sectionId: z.uuid(),
  targetLang: dubLang.default("en"),
});

export const translateAndDubSchema = z.object({
  sectionId: z.uuid(),
  targetLang: dubLang.default("en"),
  skipDub: z.coerce.boolean().default(false),
});

export const inspectVttSchema = z.object({
  sectionId: z.uuid(),
  // El track ES es el caso normal; permitimos cualquier código de idioma corto
  // para diagnóstico de tracks generados por Mux.
  lang: z.string().trim().min(2).max(10).default("es"),
});

export const gradeNowSchema = z.object({
  submissionId: z.uuid().optional(),
});

export const retriggerTranslationSchema = z.object({
  sectionId: z.uuid(),
  targetLanguages: z.array(dubLang).min(1).optional(),
});
