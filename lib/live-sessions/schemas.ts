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

// Acepta ISO completo (con offset tipo "2026-08-15T13:36:00-07:00") o
// el formato local del <input type="datetime-local"> (YYYY-MM-DDTHH:mm
// sin timezone). Cuando NO hay timezone, se interpreta como hora de la
// zona DAP oficial (America/Los_Angeles = Tijuana/San Diego).
//
// Por qué: el server action corre en Vercel (UTC). Si recibe
// "2026-08-15T13:36" sin timezone y hace `new Date(s)`, JS lo interpreta
// como server local (UTC) — la sesión queda guardada 7h antes de lo que
// el admin quiso. Con este helper, "13:36" en el form = 13:36 Tijuana =
// 20:36 UTC (o 21:36 en horario estándar).
const DAP_TIMEZONE = "America/Los_Angeles";

function parseAsDapTz(s: string): Date {
  // Si el string ya tiene timezone (Z o ±HH:MM), respetarlo
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s.trim())) {
    return new Date(s);
  }
  // Sin timezone: interpretar como zona DAP.
  // Truco: usamos Intl para descubrir el offset de la zona en esa fecha,
  // y construimos un Date UTC con el offset invertido.
  const local = new Date(s + "Z"); // parsea como UTC para tener base estable
  const asDap = new Date(
    local.toLocaleString("en-US", { timeZone: DAP_TIMEZONE }),
  );
  const offsetMs = asDap.getTime() - local.getTime();
  return new Date(local.getTime() - offsetMs);
}

const datetimeFlex = z
  .string()
  .min(10)
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "Fecha y hora inválidas",
  })
  .transform((s) => parseAsDapTz(s));

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
  image_url: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .or(z.literal("").transform(() => null))
    .refine(
      (v) => v === null || /^https?:\/\//.test(v),
      "URL de imagen debe empezar por http:// o https://",
    ),
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
