// Endpoint temporal — dispara un error a propósito para verificar que
// Sentry esté capturando bien. Borrá esta route después del primer test
// exitoso (no debe quedar en prod a largo plazo).
//
// Uso: curl https://www.dapglobal.org/api/sentry-test
// Esperar ~30s y ver el issue en sentry.io.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Acceso a una variable que no existe → ReferenceError capturado por
  // Sentry vía instrumentation.ts.
  throw new Error("Sentry smoke test — server runtime " + new Date().toISOString());

  // Línea inalcanzable solo para que TypeScript no se queje del return.
  return NextResponse.json({ ok: true });
}
