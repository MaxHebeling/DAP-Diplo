import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check para uptime monitors (BetterStack, UptimeRobot, etc.).
 *
 * Comprueba dependencias externas críticas:
 *   - Supabase (query trivial sobre `profiles`)
 *   - Stripe (HEAD a `api.stripe.com` con la clave)
 *
 * Devuelve 200 si todo OK, 503 si alguna dependencia falla. La forma
 * del JSON está pensada para que el monitor pueda parsear y alertar
 * con detalle (no solo status code).
 *
 * Mux y Resend NO se chequean acá: si Stripe + Supabase están
 * arriba, la plataforma puede recibir pagos y servir contenido —
 * el resto es ruido para el monitor principal.
 */
export async function GET() {
  const startedAt = Date.now();
  const checks: Array<{
    name: string;
    ok: boolean;
    latencyMs: number;
    error?: string;
  }> = [];

  // --- Supabase --------------------------------------------------------
  const supabaseStart = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    checks.push({
      name: "supabase",
      ok: !error,
      latencyMs: Date.now() - supabaseStart,
      ...(error && { error: error.message }),
    });
  } catch (err) {
    checks.push({
      name: "supabase",
      ok: false,
      latencyMs: Date.now() - supabaseStart,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  // --- Stripe ----------------------------------------------------------
  const stripeStart = Date.now();
  try {
    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) {
      checks.push({
        name: "stripe",
        ok: false,
        latencyMs: 0,
        error: "STRIPE_SECRET_KEY no configurado",
      });
    } else {
      // Endpoint barato: lista 1 customer (no consume webhooks ni saldo).
      const res = await fetch("https://api.stripe.com/v1/customers?limit=1", {
        method: "GET",
        headers: { Authorization: `Bearer ${sk}` },
      });
      checks.push({
        name: "stripe",
        ok: res.ok,
        latencyMs: Date.now() - stripeStart,
        ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
      });
    }
  } catch (err) {
    checks.push({
      name: "stripe",
      ok: false,
      latencyMs: Date.now() - stripeStart,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  const ok = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      ok,
      status: ok ? "healthy" : "degraded",
      checks,
      totalLatencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
