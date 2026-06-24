/**
 * Endpoint admin temporal para re-disparar la traducción Polyglot
 * de una sección con video ya subido (cuando el webhook de Mux falló
 * o el job anterior dio error). Reusa exactamente la lógica del
 * webhook video.asset.ready.
 *
 * POST /api/admin/retrigger-translation
 * Body: { sectionId: string }
 * Auth: Bearer ${CRON_SECRET} (mismo secret que usan los crons)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";
import { enqueueTranslation } from "@/lib/polyglot/client";
import { retriggerTranslationSchema } from "@/lib/admin/dub-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = retriggerTranslationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const sectionId = parsed.data.sectionId;
  const overrideLangs = parsed.data.targetLanguages;

  const admin = createAdminClient();
  const { data: section, error: fetchErr } = await admin
    .from("module_sections")
    .select("id, mux_playback_id, mux_asset_id, captions_job_id")
    .eq("id", sectionId)
    .maybeSingle<{ id: string; mux_playback_id: string | null; mux_asset_id: string | null; captions_job_id: string | null }>();
  if (fetchErr) return NextResponse.json({ error: `db: ${fetchErr.message}` }, { status: 500 });
  if (!section?.mux_playback_id || !section.mux_asset_id) {
    return NextResponse.json({ error: "section_has_no_video" }, { status: 400 });
  }

  // Limpiar captions_job_id viejo y captions desactualizadas
  await admin
    .from("module_sections")
    .update({ captions: {}, captions_job_id: null })
    .eq("id", section.id);

  // Buscar text track ES ya generado por Mux Smart Captions y descargar
  // su VTT firmando con las creds de producción (el playback es signed).
  let sourceVttContent: string | null = null;
  let removedTracks = 0;
  try {
    const asset = await muxClient().video.assets.retrieve(section.mux_asset_id);
    for (const t of asset.tracks ?? []) {
      const tt = t as unknown as {
        type: string; id: string; language_code?: string;
        status?: string; text_source?: string;
      };
      if (tt.type === "text" && tt.language_code === "es" && tt.status === "ready" && !sourceVttContent) {
        // Firmar token + descargar VTT inline (Polyglot lo recibe como sourceCaptionsVtt)
        const raw = (await muxClient().jwt.signPlaybackId(section.mux_playback_id, {
          expiration: "3600s",
          type: ["video"],
        })) as unknown as Record<string, string>;
        const tok = raw["playback-token"] ?? raw.video;
        const vttUrl = `https://stream.mux.com/${section.mux_playback_id}/text/${tt.id}.vtt?token=${tok}`;
        const r = await fetch(vttUrl);
        if (r.ok) {
          sourceVttContent = await r.text();
        } else {
          console.warn(`[retrigger] vtt download ${r.status} for track ${tt.id}`);
        }
      } else if (tt.type === "text") {
        await muxClient().video.assets.deleteTrack(section.mux_asset_id, tt.id);
        removedTracks++;
      }
    }
  } catch (e) {
    console.error(`[retrigger] asset inspect failed:`, (e as Error).message);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookSecret = process.env.POLYGLOT_WEBHOOK_SECRET;
  if (!appUrl || !webhookSecret) {
    return NextResponse.json({ error: "missing_env" }, { status: 500 });
  }

  const targetLangs = overrideLangs?.length
    ? overrideLangs
    : (process.env.DAP_TARGET_LANGUAGES ?? "en,pt").split(",").map((s) => s.trim()).filter(Boolean);

  // Construir payload: preferir sourceCaptionsUrl si tenemos VTT ES ready,
  // sino caer a videoUrl (audio.m4a) como fallback.
  const enqueueOpts: Parameters<typeof enqueueTranslation>[0] = {
    sourceLanguage: "es",
    targetLanguages: targetLangs,
    domainHint: "Christian theological class for pastors",
    externalRef: section.id,
    webhookUrl: `${appUrl}/api/captions-ready?secret=${encodeURIComponent(webhookSecret)}`,
  };
  let mode: "captions_inline" | "video";
  if (sourceVttContent) {
    enqueueOpts.sourceCaptionsVtt = sourceVttContent;
    mode = "captions_inline";
  } else {
    const raw = (await muxClient().jwt.signPlaybackId(section.mux_playback_id, {
      expiration: "3600s",
      type: ["video"],
    })) as unknown as Record<string, string>;
    const token = raw["playback-token"] ?? raw.video;
    if (!token) return NextResponse.json({ error: "no_playback_token" }, { status: 500 });
    enqueueOpts.videoUrl = `https://stream.mux.com/${section.mux_playback_id}/audio.m4a?token=${token}`;
    mode = "video";
  }

  try {
    const { jobId } = await enqueueTranslation(enqueueOpts);
    return NextResponse.json({
      ok: true,
      sectionId: section.id,
      jobId,
      mode,
      vttLength: sourceVttContent?.length ?? 0,
      removedTracks,
      targetLangs,
      jobStatusUrl: `${process.env.POLYGLOT_API_URL ?? "https://www.acts2.io"}/api/jobs/${jobId}`,
    });
  } catch (e) {
    return NextResponse.json({ error: `polyglot_enqueue: ${(e as Error).message}` }, { status: 502 });
  }
}
