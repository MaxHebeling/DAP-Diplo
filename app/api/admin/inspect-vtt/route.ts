/**
 * Admin endpoint: descarga el VTT ES del asset y devuelve diagnóstico
 * para detectar duplicaciones / corrupciones que explican el mix EN/ES
 * al final de las traducciones.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";
import { inspectVttSchema } from "@/lib/admin/dub-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = inspectVttSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { sectionId, lang } = parsed.data;
  const admin = createAdminClient();
  const { data: section } = await admin
    .from("module_sections")
    .select("id, mux_playback_id, mux_asset_id")
    .eq("id", sectionId)
    .single();
  if (!section?.mux_asset_id || !section.mux_playback_id) {
    return NextResponse.json({ error: "no_video" }, { status: 400 });
  }
  const asset = await muxClient().video.assets.retrieve(section.mux_asset_id);
  const esTrack = (asset.tracks ?? []).find((t) => {
    const tt = t as unknown as { type: string; language_code?: string; status?: string };
    return tt.type === "text" && tt.language_code === lang && tt.status === "ready";
  }) as unknown as { id: string } | undefined;
  if (!esTrack) return NextResponse.json({ error: `no_${lang}_track` }, { status: 400 });

  const raw = (await muxClient().jwt.signPlaybackId(section.mux_playback_id, {
    expiration: "300s",
    type: ["video"],
  })) as unknown as Record<string, string>;
  const token = raw["playback-token"] ?? raw.video;
  const vttUrl = `https://stream.mux.com/${section.mux_playback_id}/text/${esTrack.id}.vtt?token=${token}`;
  const r = await fetch(vttUrl);
  if (!r.ok) return NextResponse.json({ error: `vtt_${r.status}` }, { status: 502 });
  const vtt = await r.text();

  // Diagnóstico: contar lines totales, lines únicas, duplicados consecutivos,
  // y devolver primeras + últimas 30 lines.
  const lines = vtt.split("\n");
  const cueLines = lines.filter((l) => l.trim() && !l.includes("-->") && !/^\d+$/.test(l.trim()) && l.trim() !== "WEBVTT");
  const dupePairs: string[] = [];
  for (let i = 1; i < cueLines.length; i++) {
    if (cueLines[i] === cueLines[i - 1] && cueLines[i].trim()) {
      dupePairs.push(cueLines[i]);
    }
  }
  // Detectar si las últimas N lines son sospechosamente repetidas
  const last30 = cueLines.slice(-30);

  return NextResponse.json({
    vttLength: vtt.length,
    totalLines: lines.length,
    cueTextLines: cueLines.length,
    duplicateConsecutive: dupePairs.length,
    duplicateSamples: dupePairs.slice(0, 5),
    last30Lines: last30,
    first10Lines: cueLines.slice(0, 10),
  });
}
