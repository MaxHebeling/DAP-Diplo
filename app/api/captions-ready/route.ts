/**
 * Webhook que recibe Polyglot AI cuando termina de traducir un video.
 *
 * Auth: header `x-polyglot-secret` debe matchear `POLYGLOT_WEBHOOK_SECRET`.
 * Body: { jobId, externalRef (sectionId), status, totalCostUsd, ... }
 *
 * Flujo:
 *  1. Validar secret + buscar la sección por externalRef
 *  2. Fetch detalles completos del job desde Polyglot (incluye VTT URLs)
 *  3. Por cada traducción, attach al asset Mux como text track
 *  4. Guardar el mapa de captions en module_sections
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";
import { getJob, type PolyglotTranslation } from "@/lib/polyglot/client";

export const runtime = "nodejs";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ko: "한국어",
  ja: "日本語",
  zh: "中文",
};

export async function POST(req: Request) {
  // Secret se pasa por query string en webhookUrl (no header) para que
  // polyglot-ai pueda enviarlo sin lógica custom de auth.
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.POLYGLOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    jobId?: string;
    externalRef?: string;
    status?: string;
    totalCostUsd?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const { jobId, externalRef, status } = body;
  if (!jobId || !externalRef) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (status !== "done") {
    console.error(`[captions-ready] job ${jobId} status=${status}, skipping attach`);
    return NextResponse.json({ received: true, skipped: status });
  }

  const admin = createAdminClient();
  const { data: section } = await admin
    .from("module_sections")
    .select("id, mux_asset_id, captions")
    .eq("id", externalRef)
    .maybeSingle();
  if (!section?.mux_asset_id) {
    console.error(`[captions-ready] section ${externalRef} not found or has no mux_asset_id`);
    return NextResponse.json({ error: "section_not_found" }, { status: 404 });
  }

  // Fetch full results from Polyglot
  let translations: PolyglotTranslation[] = [];
  try {
    const { translations: t } = await getJob(jobId);
    translations = t ?? [];
  } catch (e) {
    console.error(`[captions-ready] failed to fetch job ${jobId}:`, e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
  if (translations.length === 0) {
    return NextResponse.json({ received: true, warning: "no translations" });
  }

  const captions = (section.captions as Record<string, string>) ?? {};
  const mux = muxClient();
  const attached: string[] = [];
  const failures: { lang: string; err: string }[] = [];

  for (const t of translations) {
    try {
      await mux.video.assets.createTrack(section.mux_asset_id, {
        url: t.vtt_url,
        type: "text",
        text_type: "subtitles",
        language_code: t.target_language,
        name: LANG_NAMES[t.target_language] ?? t.target_language.toUpperCase(),
        closed_captions: false,
      });
      captions[t.target_language] = t.vtt_url;
      attached.push(t.target_language);
    } catch (e) {
      const msg = (e as Error).message;
      console.error(`[captions-ready] attach ${t.target_language} failed:`, msg);
      failures.push({ lang: t.target_language, err: msg });
    }
  }

  const { error: updErr } = await admin
    .from("module_sections")
    .update({ captions, captions_job_id: jobId })
    .eq("id", section.id);
  if (updErr) {
    console.error(`[captions-ready] DB update failed:`, updErr);
  }

  return NextResponse.json({
    received: true,
    sectionId: section.id,
    attached,
    failures,
  });
}
