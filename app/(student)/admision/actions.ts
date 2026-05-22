"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadConsentLetter, signedConsentLetterUrl } from "@/lib/admission/storage";
import { sendAdmissionRequestEmail } from "@/lib/email/send-admission-request";
import {
  admissionFormSchema,
  resolveCountry,
  type AdmissionFormInput,
} from "@/lib/admission/schemas";

export type SubmitAdmissionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Server action invocada por el form. Sube la carta de consentimiento
 * (si aplica) → INSERT en admissions → UPDATE profiles.admission_status
 * a 'pending' → email a EMAIL_ADMISSIONS → redirect a /admision/estado.
 *
 * Las columnas sensibles de profiles (admission_status, role, etc.)
 * están REVOCADAS del rol authenticated por la migration 0003 — solo
 * el service-role (createAdminClient) puede mutarlas. Acá usamos
 * admin para esa parte y supabase normal para validar la sesión.
 */
export async function submitAdmissionAction(
  formData: FormData,
): Promise<SubmitAdmissionResult> {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };
  }

  // 2. Parse + valida payload
  const raw = parseFormPayload(formData);
  const parsed = admissionFormSchema.safeParse({
    ...raw,
    // El consent_letter_url se setea acá tras el upload (no viene en el form).
    consent_letter_url: undefined,
  });

  // Si NO pertenece a la red, esperamos un file → lo subimos primero.
  const file = formData.get("consent_letter") as File | null;
  let consentPath: string | undefined;

  if (raw.belongs_to_network !== true) {
    if (!file || file.size === 0) {
      return {
        ok: false,
        error: "Falta la carta de consentimiento.",
        fieldErrors: {
          consent_letter_url:
            "Si no perteneces a la Red, debés subir la carta firmada por tu pastor.",
        },
      };
    }
    try {
      const { path } = await uploadConsentLetter({ userId: user.id, file });
      consentPath = path;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error subiendo carta.";
      return { ok: false, error: msg };
    }
  }

  // 3. Re-validar con consent_letter_url resuelto
  const finalParse = admissionFormSchema.safeParse({
    ...raw,
    consent_letter_url: consentPath,
  });
  if (!finalParse.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of finalParse.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: "Revisá los datos del formulario.",
      fieldErrors,
    };
  }
  // Mantenemos `parsed` también para que aparezca usado y para futuras
  // validaciones server-only. finalParse es la única fuente de datos.
  void parsed;
  const data = finalParse.data;

  // 4. Resolver country real ("Otro" → country_other)
  const resolvedCountry = resolveCountry({
    country: data.country,
    country_other: data.country_other,
  });

  // 5. INSERT en admissions (con auth user — RLS "adm self insert" lo
  //    permite si auth.uid()=user_id). NO usamos admin acá: el INSERT
  //    en admissions sí es operación del alumno.
  const { error: insertErr } = await supabase.from("admissions").insert({
    user_id: user.id,
    full_name: data.full_name,
    birth_date: data.birth_date,
    country: resolvedCountry,
    city: data.city,
    phone: data.phone,
    email: data.email,
    church_name: data.church_name || null,
    ministry_name: data.ministry_name || null,
    profession: data.profession || null,
    company_or_sector: data.company_or_sector || null,
    belongs_to_network: data.belongs_to_network,
    network_name: data.belongs_to_network
      ? (data.network_name as string)
      : null,
    consent_letter_url: consentPath ?? null,
    status: "pending",
  });
  if (insertErr) {
    return {
      ok: false,
      error: `No se pudo enviar la solicitud: ${insertErr.message}`,
    };
  }

  // 6. UPDATE profiles.admission_status='pending' — requiere admin
  //    (la columna está revocada del rol authenticated).
  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("profiles")
    .update({ admission_status: "pending" })
    .eq("id", user.id);
  if (updErr) {
    // No revertimos el insert: el equipo lo verá igual; logueamos.
    console.error(
      `[admission] No se pudo actualizar profiles.admission_status user=${user.id}: ${updErr.message}`,
    );
  }

  // 7. Email a admisiones@dapglobal.org
  const signedUrl = consentPath
    ? await signedConsentLetterUrl(consentPath)
    : null;
  const emailRes = await sendAdmissionRequestEmail({
    fullName: data.full_name,
    email: data.email,
    birthDate: data.birth_date,
    country: resolvedCountry,
    city: data.city,
    phone: data.phone,
    churchName: data.church_name || null,
    ministryName: data.ministry_name || null,
    profession: data.profession || null,
    companyOrSector: data.company_or_sector || null,
    belongsToNetwork: data.belongs_to_network,
    networkName: data.belongs_to_network
      ? (data.network_name as string)
      : null,
    consentLetterSignedUrl: signedUrl,
    submittedAt: new Date(),
  });
  if (!emailRes.ok) {
    console.error(
      `[admission] sendAdmissionRequestEmail falló para user=${user.id}: ${emailRes.error}`,
    );
  }

  revalidatePath("/admision");
  revalidatePath("/admision/estado");
  redirect("/admision/estado");
}

/**
 * Convierte FormData a un objeto plano con los tipos esperados por el
 * schema (booleans como boolean, no string).
 */
function parseFormPayload(fd: FormData): Partial<AdmissionFormInput> {
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const belongs = fd.get("belongs_to_network");
  return {
    full_name: get("full_name"),
    birth_date: get("birth_date"),
    country: get("country") as AdmissionFormInput["country"] | undefined,
    country_other: get("country_other"),
    city: get("city"),
    phone: get("phone"),
    email: get("email"),
    church_name: get("church_name"),
    ministry_name: get("ministry_name"),
    profession: get("profession"),
    company_or_sector: get("company_or_sector"),
    belongs_to_network: belongs === "true" || belongs === "yes",
    network_name: get("network_name") as AdmissionFormInput["network_name"],
  };
}
