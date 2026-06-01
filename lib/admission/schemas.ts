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
  "India",
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
  India: "+91",
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

// Placeholder de número local por país. Da un ejemplo realista al alumno
// sin obligarlo a un formato específico (la validación es solo length).
export const COUNTRY_PHONE_PLACEHOLDER: Record<Country, string> = {
  Argentina: "11 1234 5678",
  Bolivia: "70123456",
  Chile: "9 1234 5678",
  Colombia: "300 123 4567",
  "Costa Rica": "8312 3456",
  Cuba: "5 1234567",
  Ecuador: "99 123 4567",
  "El Salvador": "7012 3456",
  España: "612 34 56 78",
  "Estados Unidos": "(555) 123-4567",
  Guatemala: "5123 4567",
  Honduras: "9123 4567",
  India: "98765 43210",
  México: "55 1234 5678",
  Nicaragua: "8123 4567",
  Panamá: "6123 4567",
  Paraguay: "981 123 456",
  Perú: "912 345 678",
  "Puerto Rico": "(787) 123-4567",
  "República Dominicana": "(809) 123-4567",
  Uruguay: "9 1234 5678",
  Venezuela: "412 123 4567",
  Otro: "Tu número",
};

// Lista completa de dial codes para el dropdown del PhoneField.
// `id` es único por país (ej. "US", "CA") para que el <select> distinga
// entre países que comparten dial code (USA, Canadá, PR, RD = +1).
// `code` es el prefijo real que se concatena al número del alumno.
// Mapping de Country (COUNTRIES) → id en COUNTRY_DIAL_ID abajo.
export const ALL_DIAL_CODES: Array<{
  id: string;
  label: string;
  code: string;
  flag: string;
  country: string;
}> = [
  { id: "AR", flag: "🇦🇷", country: "Argentina", code: "+54", label: "🇦🇷 +54" },
  { id: "BO", flag: "🇧🇴", country: "Bolivia", code: "+591", label: "🇧🇴 +591" },
  { id: "BR", flag: "🇧🇷", country: "Brasil", code: "+55", label: "🇧🇷 +55" },
  { id: "CA", flag: "🇨🇦", country: "Canadá", code: "+1", label: "🇨🇦 +1" },
  { id: "CL", flag: "🇨🇱", country: "Chile", code: "+56", label: "🇨🇱 +56" },
  { id: "CO", flag: "🇨🇴", country: "Colombia", code: "+57", label: "🇨🇴 +57" },
  { id: "CR", flag: "🇨🇷", country: "Costa Rica", code: "+506", label: "🇨🇷 +506" },
  { id: "CU", flag: "🇨🇺", country: "Cuba", code: "+53", label: "🇨🇺 +53" },
  { id: "EC", flag: "🇪🇨", country: "Ecuador", code: "+593", label: "🇪🇨 +593" },
  { id: "SV", flag: "🇸🇻", country: "El Salvador", code: "+503", label: "🇸🇻 +503" },
  { id: "ES", flag: "🇪🇸", country: "España", code: "+34", label: "🇪🇸 +34" },
  { id: "US", flag: "🇺🇸", country: "Estados Unidos", code: "+1", label: "🇺🇸 +1" },
  { id: "FR", flag: "🇫🇷", country: "Francia", code: "+33", label: "🇫🇷 +33" },
  { id: "GT", flag: "🇬🇹", country: "Guatemala", code: "+502", label: "🇬🇹 +502" },
  { id: "HN", flag: "🇭🇳", country: "Honduras", code: "+504", label: "🇭🇳 +504" },
  { id: "IN", flag: "🇮🇳", country: "India", code: "+91", label: "🇮🇳 +91" },
  { id: "IT", flag: "🇮🇹", country: "Italia", code: "+39", label: "🇮🇹 +39" },
  { id: "MX", flag: "🇲🇽", country: "México", code: "+52", label: "🇲🇽 +52" },
  { id: "NI", flag: "🇳🇮", country: "Nicaragua", code: "+505", label: "🇳🇮 +505" },
  { id: "PA", flag: "🇵🇦", country: "Panamá", code: "+507", label: "🇵🇦 +507" },
  { id: "PY", flag: "🇵🇾", country: "Paraguay", code: "+595", label: "🇵🇾 +595" },
  { id: "PE", flag: "🇵🇪", country: "Perú", code: "+51", label: "🇵🇪 +51" },
  { id: "PT", flag: "🇵🇹", country: "Portugal", code: "+351", label: "🇵🇹 +351" },
  { id: "PR", flag: "🇵🇷", country: "Puerto Rico", code: "+1", label: "🇵🇷 +1" },
  { id: "GB", flag: "🇬🇧", country: "Reino Unido", code: "+44", label: "🇬🇧 +44" },
  { id: "DO", flag: "🇩🇴", country: "República Dominicana", code: "+1", label: "🇩🇴 +1" },
  { id: "UY", flag: "🇺🇾", country: "Uruguay", code: "+598", label: "🇺🇾 +598" },
  { id: "VE", flag: "🇻🇪", country: "Venezuela", code: "+58", label: "🇻🇪 +58" },
];

// Mapping Country → id de ALL_DIAL_CODES. Cuando el alumno elige país
// el form selecciona el ID correcto del dropdown (evita ambigüedad NANP).
export const COUNTRY_DIAL_ID: Record<Country, string> = {
  Argentina: "AR",
  Bolivia: "BO",
  Chile: "CL",
  Colombia: "CO",
  "Costa Rica": "CR",
  Cuba: "CU",
  Ecuador: "EC",
  "El Salvador": "SV",
  España: "ES",
  "Estados Unidos": "US",
  Guatemala: "GT",
  Honduras: "HN",
  India: "IN",
  México: "MX",
  Nicaragua: "NI",
  Panamá: "PA",
  Paraguay: "PY",
  Perú: "PE",
  "Puerto Rico": "PR",
  "República Dominicana": "DO",
  Uruguay: "UY",
  Venezuela: "VE",
  Otro: "",
};

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
