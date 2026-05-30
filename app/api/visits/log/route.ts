import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Beacon de visit log anónimo. Fire-and-forget desde un useEffect en
 * el layout público. Sin PII:
 *   - country del header Vercel x-vercel-ip-country
 *   - page_path del body (cliente lo manda)
 *   - referrer del body
 *   - user_agent truncado a 200 chars
 *   - ip_hash (SHA-256(ip + salt), truncado a 32 chars)
 *
 * Anti-spam: dedupe por (ip_hash, page_path) dentro de 30 min para no
 * inflar la tabla con refreshes consecutivos del mismo visitante.
 *
 * Auto-cleanup: probabilísticamente borra rows > 30 días (2% chance
 * por request).
 */
export async function POST(request: NextRequest) {
  let body: { path?: unknown; referrer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
  const referrer =
    typeof body.referrer === "string" ? body.referrer.slice(0, 200) : null;

  const h = request.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    "unknown";
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null;
  const ua = h.get("user-agent")?.slice(0, 200) ?? null;

  const salt = process.env.IP_HASH_SALT ?? "dap-default-salt";
  const ipHash = createHash("sha256")
    .update(`${ip}:${salt}`)
    .digest("hex")
    .slice(0, 32);

  const admin = createAdminClient();

  // Dedupe: si la misma (ip_hash, path) entró en los últimos 30 min, skip.
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("visit_logs")
    .select("id")
    .eq("ip_hash", ipHash)
    .eq("page_path", path)
    .gt("created_at", since)
    .limit(1)
    .maybeSingle();
  if (recent) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // Insert
  await admin.from("visit_logs").insert({
    country: country ? country.toUpperCase() : null,
    country_code: country ? country.toUpperCase() : null,
    page_path: path,
    referrer,
    user_agent_short: ua,
    ip_hash: ipHash,
  });

  // Probabilistic cleanup de rows > 30 días (2% chance).
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("visit_logs").delete().lt("created_at", cutoff);
  }

  return NextResponse.json({ ok: true });
}
