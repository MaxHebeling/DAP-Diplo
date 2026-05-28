"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { findCountry } from "@/lib/data/countries";
import { checkRateLimit } from "@/lib/security/rate-limit";

const leadSchema = z.object({
  email: z.string().email("Email inválido").max(160),
  fullName: z.string().min(2).max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  source: z
    .enum(["landing", "exit-intent", "promo", "contacto", "footer", "other"])
    .default("landing"),
  pagePath: z.string().max(200).optional().nullable(),
  // Honeypot: si viene con valor, es bot.
  website: z.string().max(0).optional().nullable(),
});

export type CaptureLeadResult =
  | { ok: true; id: string; duplicated: boolean }
  | { ok: false; error: string };

function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "dap-default-salt";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

function getClientIp(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

function getCountry(h: Headers): { country: string | null; code: string | null } {
  const code =
    h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null;
  if (!code) return { country: null, code: null };
  const upper = code.toUpperCase();
  const c = findCountry(upper);
  return { country: c?.name ?? upper, code: upper };
}

function shortUA(h: Headers): string | null {
  const ua = h.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 200);
}

/**
 * Captura un lead desde el form público (anónimo).
 *
 * Anti-abuse:
 *   - Honeypot: si "website" tiene valor, descartamos silenciosamente.
 *   - Rate limit Postgres-backed: 3 attempts cada 5 min por IP.
 *   - Email único (case-insensitive) — si ya existe, actualiza en vez
 *     de duplicar (UX: el lead se puede arrepentir y dejar mensaje
 *     adicional sin generar 2 filas).
 */
export async function captureLeadAction(
  _prev: CaptureLeadResult | undefined,
  formData: FormData,
): Promise<CaptureLeadResult> {
  const raw = {
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    source: formData.get("source") ?? "landing",
    pagePath: formData.get("pagePath"),
    website: formData.get("website") ?? "", // honeypot
  };

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  // Honeypot triggered → fingir éxito (que el bot no se entere).
  if (data.website && data.website.length > 0) {
    return { ok: true, id: "honeypot", duplicated: false };
  }

  const h = await headers();
  const ip = getClientIp(h);
  const ipHash = hashIp(ip);

  // Rate limit por IP — 3 leads / 5 min máximo.
  const limit = await checkRateLimit(null, {
    scope: "lead-capture",
    max: 3,
    windowSeconds: 300,
    key: ip,
  });
  if (!limit.ok) {
    return {
      ok: false,
      error: "Demasiados intentos. Esperá unos minutos.",
    };
  }

  const { country, code } = getCountry(h);
  const ua = shortUA(h);
  const admin = createAdminClient();
  const emailLower = data.email.trim().toLowerCase();

  // ¿Ya existe un lead con este email?
  const { data: existing } = await admin
    .from("leads")
    .select("id, status")
    .ilike("email", emailLower)
    .maybeSingle<{ id: string; status: string }>();

  if (existing) {
    // Update: refrescar mensaje + país + UA, mantener status si ya no es 'new'.
    await admin
      .from("leads")
      .update({
        full_name: data.fullName ?? null,
        phone: data.phone ?? null,
        message: data.message ?? null,
        country: country,
        country_code: code,
        page_path: data.pagePath ?? null,
        user_agent_short: ua,
        ip_hash: ipHash,
      })
      .eq("id", existing.id);
    return { ok: true, id: existing.id, duplicated: true };
  }

  // Insert nuevo
  const { data: inserted, error: insErr } = await admin
    .from("leads")
    .insert({
      email: emailLower,
      full_name: data.fullName ?? null,
      phone: data.phone ?? null,
      message: data.message ?? null,
      source: data.source,
      page_path: data.pagePath ?? null,
      country: country,
      country_code: code,
      user_agent_short: ua,
      ip_hash: ipHash,
    })
    .select("id")
    .single<{ id: string }>();

  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? "No se pudo guardar" };
  }
  return { ok: true, id: inserted.id, duplicated: false };
}
