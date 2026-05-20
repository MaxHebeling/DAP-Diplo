import { z } from "zod";

// Países hispanohablantes principales + "Otro" (input libre).
// Si en el futuro se globaliza, esta lista crece sin tocar el schema.
export const COUNTRIES = [
  "Argentina",
  "Bolivia",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Ecuador",
  "El Salvador",
  "España",
  "Estados Unidos",
  "Guatemala",
  "Honduras",
  "México",
  "Nicaragua",
  "Panamá",
  "Paraguay",
  "Perú",
  "Puerto Rico",
  "República Dominicana",
  "Uruguay",
  "Venezuela",
  "Otro",
] as const;

export type Country = (typeof COUNTRIES)[number];

export const NETWORK_OPTIONS = [
  { value: "reino_y_avivamiento", label: "Red Apostólica Reino y Avivamiento" },
  { value: "revival_kingdom", label: "Revival & Kingdom Ministries, INC" },
] as const;

export type NetworkValue = (typeof NETWORK_OPTIONS)[number]["value"];

// Form schema (alumno) — submit del cliente al server action.
export const admissionFormSchema = z
  .object({
    // Datos personales
    full_name: z.string().min(3, "Tu nombre completo, por favor.").max(200),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
    country: z.enum(COUNTRIES),
    country_other: z.string().max(100).optional(),
    city: z.string().min(2, "Tu ciudad.").max(120),
    phone: z
      .string()
      .min(7, "Teléfono inválido.")
      .max(30, "Teléfono demasiado largo."),
    email: z.string().email(),

    // Pertenencia
    church_name: z.string().max(200).optional(),
    ministry_name: z.string().max(200).optional(),
    profession: z.string().max(120).optional(),
    company_or_sector: z.string().max(200).optional(),

    // Red Apostólica
    belongs_to_network: z.boolean(),
    network_name: z
      .union([z.enum(["reino_y_avivamiento", "revival_kingdom"]), z.literal("")])
      .optional(),

    // Carta de consentimiento (path en bucket consent-letters)
    // Se setea desde el cliente DESPUÉS del upload. Server action
    // valida que exista si belongs_to_network=false.
    consent_letter_url: z.string().optional(),
  })
  // Refinement: si NO pertenece a la Red → carta obligatoria.
  .refine(
    (data) => {
      if (data.belongs_to_network) return true;
      return (
        typeof data.consent_letter_url === "string" &&
        data.consent_letter_url.length > 0
      );
    },
    {
      message:
        "Si no perteneces a la Red, debés subir la carta de consentimiento firmada por tu pastor.",
      path: ["consent_letter_url"],
    },
  )
  // Refinement: si pertenece a la Red → tiene que seleccionar cuál.
  .refine(
    (data) => {
      if (!data.belongs_to_network) return true;
      return (
        data.network_name === "reino_y_avivamiento" ||
        data.network_name === "revival_kingdom"
      );
    },
    {
      message: "Indicá a cuál red ministerial perteneces.",
      path: ["network_name"],
    },
  )
  // Refinement: si país = "Otro" → country_other obligatorio.
  .refine(
    (data) => {
      if (data.country !== "Otro") return true;
      return (
        typeof data.country_other === "string" &&
        data.country_other.trim().length >= 2
      );
    },
    {
      message: "Indicá tu país.",
      path: ["country_other"],
    },
  );

export type AdmissionFormInput = z.infer<typeof admissionFormSchema>;

// File constraints (UI)
export const MAX_LETTER_BYTES = 10 * 1024 * 1024; // 10 MB
export const ACCEPTED_LETTER_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];
export const ACCEPTED_LETTER_EXT = ".pdf,.jpg,.jpeg,.png";

/** Resuelve el país real (combinando country + country_other). */
export function resolveCountry(input: {
  country: Country;
  country_other?: string;
}): string {
  if (input.country === "Otro") return (input.country_other ?? "").trim();
  return input.country;
}
