import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Devuelve el país detectado por GeoIP (vía headers de Vercel/Cloudflare).
 * Lo consume el modal de onboarding para decidir si oculta el beneficio
 * matrimonial Argentina cuando el visitante no parece estar conectándose
 * desde Argentina.
 *
 * En localhost devuelve `null` — no rompe el flujo en dev.
 *
 * !!! TEMP-SMOKE-TEST-AR !!!
 * Hoy forzamos AR para poder probar el flow de matrimonio desde otros
 * países durante el smoke test pre-launch. Hay que REVERTIR (devolver
 * la lectura real de headers) antes del 01 Jun. Buscar el comentario
 * para identificar el bloque.
 */
export async function GET() {
  // TEMP-SMOKE-TEST-AR — devolver AR siempre (revertir después del test).
  return NextResponse.json({ country: "AR" });

  // CÓDIGO ORIGINAL (restaurar después del smoke test):
  // const country =
  //   request.headers.get("x-vercel-ip-country") ??
  //   request.headers.get("cf-ipcountry") ??
  //   null;
  // return NextResponse.json({
  //   country: country ? country.toUpperCase() : null,
  // });
}
