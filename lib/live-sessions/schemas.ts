import { z } from "zod";

export const LIVE_KINDS = [
  "masterclass",
  "activation",
  "mentorship",
  "special",
] as const;
export type LiveKind = (typeof LIVE_KINDS)[number];

export const LIVE_KIND_LABEL: Record<LiveKind, string> = {
  masterclass: "MasterClass",
  activation: "Activación",
  mentorship: "Mentoría grupal",
  special: "Evento especial",
};

// Acepta tanto ISO completo como el formato local del <input type="datetime-local">
// (YYYY-MM-DDTHH:mm) y lo transforma a Date.
const datetimeFlex = z
  .string()
  .min(10)
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "Fecha y hora inválidas",
  })
  .transform((s) => new Date(s));

export const liveSessionCreateSchema = z.object({
  kind: z.enum(LIVE_KINDS),
  title: z.string().trim().min(4).max(160),
  description: z
    .string()
    .trim()
    .max(4000)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  scheduled_at: datetimeFlex,
  duration_minutes: z.coerce.number().int().min(15).max(480),
  meeting_url: z
    .string()
    .trim()
    .url("URL de la reunión inválida")
    .max(500),
  host_name: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  phase_id: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export const liveSessionUpdateSchema = liveSessionCreateSchema.extend({
  id: z.uuid(),
  recording_url: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .or(z.literal("").transform(() => null))
    .refine(
      (v) => v === null || /^https?:\/\//.test(v),
      "Debe empezar por http:// o https://",
    ),
  recording_mux_playback_id: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const liveSessionDeleteSchema = z.object({ id: z.uuid() });
