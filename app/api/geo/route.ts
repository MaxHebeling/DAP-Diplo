import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Devuelve el país detectado por GeoIP (vía headers de Vercel/Cloudflare).
 * Lo consume el modal de onboarding para decidir si oculta el beneficio
 * matrimonial Argentina cuando el visitante no parece estar conectándose
 * desde Argentina.
 *
 * En localhost devuelve `null` — no rompe el flujo en dev.
 */
export async function GET(request: NextRequest) {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;

  return NextResponse.json({
    country: country ? country.toUpperCase() : null,
  });
}
