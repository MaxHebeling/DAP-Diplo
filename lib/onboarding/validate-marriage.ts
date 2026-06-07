import type { NextRequest } from "next/server";

import { AR_PROVINCES, isArgentinePhone } from "@/lib/data/argentina";
import type { MarriagePayload } from "./schemas";

export type ValidationError = { error: string; status: number };

export function getGeoIpCountry(request: NextRequest): string | null {
  return (
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null
  );
}

/**
 * Chequeos cross-field específicos del flow matrimonio AR. Devuelve
 * `null` si todo OK, o `{error, status}` con el primer fallo encontrado.
 *
 * Reglas:
 *  - countryCode debe ser AR
 *  - provincias de ambos cónyuges deben estar en AR_PROVINCES
 *  - teléfonos deben ser argentinos (+54)
 *  - emails distintos entre cónyuges
 *  - declaredResidenceInAr === true (checkbox del modal)
 *  - GeoIP (si está disponible) debe coincidir con AR — null no bloquea
 *    para no romper local dev sin headers Vercel
 */
export function validateMarriageInputs(
  data: MarriagePayload,
  request: NextRequest,
): ValidationError | null {
  if (data.countryCode !== "AR") {
    return {
      error: "La inscripción matrimonio es exclusiva para Argentina.",
      status: 400,
    };
  }
  if (!AR_PROVINCES.includes(data.spouse1.province)) {
    return { error: "Provincia inválida del cónyuge 1.", status: 400 };
  }
  if (!AR_PROVINCES.includes(data.spouse2.province)) {
    return { error: "Provincia inválida del cónyuge 2.", status: 400 };
  }
  if (!isArgentinePhone(data.spouse1.phone)) {
    return {
      error: "El teléfono del cónyuge 1 debe ser argentino (+54).",
      status: 400,
    };
  }
  if (!isArgentinePhone(data.spouse2.phone)) {
    return {
      error: "El teléfono del cónyuge 2 debe ser argentino (+54).",
      status: 400,
    };
  }
  if (
    data.spouse1.email.toLowerCase() === data.spouse2.email.toLowerCase()
  ) {
    return {
      error: "Los cónyuges deben tener emails distintos.",
      status: 400,
    };
  }
  if (!data.declaredResidenceInAr) {
    return {
      error: "Falta la confirmación de residencia en Argentina.",
      status: 400,
    };
  }
  const geoCountry = getGeoIpCountry(request);
  if (geoCountry && geoCountry.toUpperCase() !== "AR") {
    return {
      error: `El beneficio matrimonial es exclusivo para Argentina. Detectamos tu conexión desde ${geoCountry.toUpperCase()}.`,
      status: 403,
    };
  }
  return null;
}
