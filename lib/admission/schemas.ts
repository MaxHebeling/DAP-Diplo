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
}> = [
  { id: "AR", label: "Argentina (+54)", code: "+54" },
  { id: "BO", label: "Bolivia (+591)", code: "+591" },
  { id: "BR", label: "Brasil (+55)", code: "+55" },
  { id: "CA", label: "Canadá (+1)", code: "+1" },
  { id: "CL", label: "Chile (+56)", code: "+56" },
  { id: "CO", label: "Colombia (+57)", code: "+57" },
  { id: "CR", label: "Costa Rica (+506)", code: "+506" },
  { id: "CU", label: "Cuba (+53)", code: "+53" },
  { id: "EC", label: "Ecuador (+593)", code: "+593" },
  { id: "SV", label: "El Salvador (+503)", code: "+503" },
  { id: "ES", label: "España (+34)", code: "+34" },
  { id: "US", label: "Estados Unidos (+1)", code: "+1" },
  { id: "FR", label: "Francia (+33)", code: "+33" },
  { id: "GT", label: "Guatemala (+502)", code: "+502" },
  { id: "HN", label: "Honduras (+504)", code: "+504" },
  { id: "IT", label: "Italia (+39)", code: "+39" },
  { id: "MX", label: "México (+52)", code: "+52" },
  { id: "NI", label: "Nicaragua (+505)", code: "+505" },
  { id: "PA", label: "Panamá (+507)", code: "+507" },
  { id: "PY", label: "Paraguay (+595)", code: "+595" },
  { id: "PE", label: "Perú (+51)", code: "+51" },
  { id: "PT", label: "Portugal (+351)", code: "+351" },
  { id: "PR", label: "Puerto Rico (+1)", code: "+1" },
  { id: "GB", label: "Reino Unido (+44)", code: "+44" },
  { id: "DO", label: "República Dominicana (+1)", code: "+1" },
  { id: "UY", label: "Uruguay (+598)", code: "+598" },
  { id: "VE", label: "Venezuela (+58)", code: "+58" },
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
