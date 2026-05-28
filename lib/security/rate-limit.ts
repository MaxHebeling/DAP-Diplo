import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sliding-window rate limiter respaldado por la tabla
 * `rate_limit_attempts` (ver migration 0024).
 *
 * Estrategia:
 *   1. INSERT del attempt actual (siempre).
 *   2. COUNT de filas (scope, key, created_at > now() - window).
 *   3. Si count > max → bloquear.
 *   4. Cleanup oportunista de filas viejas (> 24h) cada N llamadas.
 *
 * Cross-instance reliable (no depende de memoria del worker).
 *
 * Uso típico al inicio de una route handler:
 *
 *   const limit = await checkRateLimit(request, {
 *     scope: "onboarding-complete",
 *     max: 5,
 *     windowSeconds: 600,
 *   });
 *   if (!limit.ok) {
 *     return NextResponse.json(
 *       { error: "Demasiados intentos. Esperá unos minutos." },
 *       { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
 *     );
 *   }
 */

type Options = {
  scope: string;          // identifica el endpoint (ej. "onboarding-complete")
  max: number;            // cuántos requests permitidos en la ventana
  windowSeconds: number;  // tamaño de la ventana (ej. 600 = 10 min)
  key?: string;           // si no se pasa, se deriva del IP del request
};

type Result =
  | { ok: true; remaining: number }
  | { ok: false; remaining: 0; retryAfter: number };

export function getClientIp(request: NextRequest): string {
  // Vercel envía `x-forwarded-for` con la IP del cliente como primera
  // entrada (separadas por coma). Cloudflare usa `cf-connecting-ip`.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function checkRateLimit(
  request: NextRequest | null,
  opts: Options,
): Promise<Result> {
  const admin = createAdminClient();
  // Si el caller pasa `key` explícito (ej. server action sin acceso a
  // NextRequest), lo usamos. Si no, derivamos del request.
  const key = opts.key ?? (request ? getClientIp(request) : "unknown");
  const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();

  // 1. Registrar el intento actual.
  const { error: insErr } = await admin
    .from("rate_limit_attempts")
    .insert({ scope: opts.scope, key });
  if (insErr) {
    // En caso de error de DB, no bloqueamos: degradamos abierto para no
    // tirar el flujo principal por un problema secundario. Sentry/log
    // del caller debería capturar esto.
    console.error(
      `[rate-limit] insert falló scope=${opts.scope} key=${key}: ${insErr.message}`,
    );
    return { ok: true, remaining: opts.max };
  }

  // 2. Contar intentos dentro de la ventana.
  const { count, error: countErr } = await admin
    .from("rate_limit_attempts")
    .select("id", { count: "exact", head: true })
    .eq("scope", opts.scope)
    .eq("key", key)
    .gt("created_at", since);

  if (countErr) {
    console.error(
      `[rate-limit] count falló scope=${opts.scope}: ${countErr.message}`,
    );
    return { ok: true, remaining: opts.max };
  }

  const used = count ?? 1;
  const remaining = Math.max(0, opts.max - used);

  // 3. Cleanup oportunista de filas > 24h (probabilidad 1/50 para
  // distribuir costo). Mantiene la tabla acotada sin necesitar un cron.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await admin.from("rate_limit_attempts").delete().lt("created_at", cutoff);
  }

  if (used > opts.max) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: opts.windowSeconds,
    };
  }

  return { ok: true, remaining };
}
