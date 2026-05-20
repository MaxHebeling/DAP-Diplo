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

// Prefijo telefónico por país. Si el usuario elige otro país no listado
// ("Otro") arrancamos sin prefijo y puede cambiarlo en el dropdown
// del PhoneField.
export const COUNTRY_DIAL_CODES: Record<Country, string> = {
  Argentina: "+54",
  Bolivia: "+591",
  Chile: "+56",
  Colombia: "+57",
  "Costa Rica": "+506",
  Cuba: "+53",
  Ecuador: "+593",
  "El Salvador": "+503",
  España: "+34",
  "Estados Unidos": "+1",
  Guatemala: "+502",
  Honduras: "+504",
  México: "+52",
  Nicaragua: "+505",
  Panamá: "+507",
  Paraguay: "+595",
  Perú: "+51",
  "Puerto Rico": "+1",
  "República Dominicana": "+1",
  Uruguay: "+598",
  Venezuela: "+58",
  Otro: "",
};

// Lista completa de dial codes para el dropdown del PhoneField (incluye
// otros países comunes que no están en COUNTRIES). Ordenado por nombre.
export const ALL_DIAL_CODES: Array<{ label: string; value: string }> = [
  { label: "Argentina (+54)", value: "+54" },
  { label: "Bolivia (+591)", value: "+591" },
  { label: "Brasil (+55)", value: "+55" },
  { label: "Canadá (+1)", value: "+1" },
  { label: "Chile (+56)", value: "+56" },
  { label: "Colombia (+57)", value: "+57" },
  { label: "Costa Rica (+506)", value: "+506" },
  { label: "Cuba (+53)", value: "+53" },
  { label: "Ecuador (+593)", value: "+593" },
  { label: "El Salvador (+503)", value: "+503" },
  { label: "España (+34)", value: "+34" },
  { label: "Estados Unidos (+1)", value: "+1" },
  { label: "Francia (+33)", value: "+33" },
  { label: "Guatemala (+502)", value: "+502" },
  { label: "Honduras (+504)", value: "+504" },
  { label: "Italia (+39)", value: "+39" },
  { label: "México (+52)", value: "+52" },
  { label: "Nicaragua (+505)", value: "+505" },
  { label: "Panamá (+507)", value: "+507" },
  { label: "Paraguay (+595)", value: "+595" },
  { label: "Perú (+51)", value: "+51" },
  { label: "Portugal (+351)", value: "+351" },
  { label: "Puerto Rico (+1)", value: "+1" },
  { label: "Reino Unido (+44)", value: "+44" },
  { label: "República Dominicana (+1)", value: "+1" },
  { label: "Uruguay (+598)", value: "+598" },
  { label: "Venezuela (+58)", value: "+58" },
];

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
