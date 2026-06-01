/**
 * Detección de país del visitante para routing de checkout.
 *
 * Vercel inyecta el header `x-vercel-ip-country` (ISO 3166-1 alpha-2)
 * en cada request en producción. Local dev no lo tiene → devuelve null.
 *
 * Política DAP: visitantes desde AR → Mercado Pago ARS, resto → Stripe USD.
 *
 * Override manual: si el cliente pasa ?cc=AR en la URL forzamos AR
 * (útil para testing manual o si la geo de Vercel falla).
 */

import type { NextRequest } from "next/server";
import { headers } from "next/headers";

export const AR_COUNTRY_CODE = "AR";

/**
 * Lee el código de país desde headers (server component / route handler).
 * Devuelve null si no se pudo determinar.
 */
export async function getVisitorCountry(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    null
  );
}

export function getRequestCountry(request: NextRequest): string | null {
  return (
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null
  );
}

export function isArgentina(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return countryCode.toUpperCase() === AR_COUNTRY_CODE;
}

/**
 * Lee override manual desde URL searchParams. Acepta ?cc=AR / ?cc=US.
 * Útil para testing y para que un visitante pueda forzar el flujo si
 * la geo falla.
 */
export function readCountryOverride(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): string | null {
  const cc =
    searchParams instanceof URLSearchParams
      ? searchParams.get("cc")
      : typeof searchParams.cc === "string"
        ? searchParams.cc
        : null;
  if (!cc) return null;
  const upper = cc.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  return upper;
}

/**
 * Resuelve el país efectivo aplicando override de URL si existe.
 */
export async function resolveVisitorCountry(
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>,
): Promise<string | null> {
  const override = searchParams ? readCountryOverride(searchParams) : null;
  if (override) return override;
  return await getVisitorCountry();
}
