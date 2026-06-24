/**
 * Concatena todos los chunks .mp3 de dub generados por /api/admin/dub-chunks
 * en un solo MP3 final, lo sube a Supabase storage, y attach a Mux como
 * alternate audio track.
 *
 * POST /api/admin/finalize-dub
 * Body: { sectionId, targetLang }
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";
import { finalizeDubSchema } from "@/lib/admin/dub-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUCKET = "captions";
const LANG_NAMES: Record<string, string> = {
  en: "English", pt: "Português", fr: "Français", de: "Deutsch",
};

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e) {
    return NextResponse.json({ error: "handler_exception", message: (e as Error).message }, { status: 500 });
  }
}

async function handle(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = finalizeDubSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { sectionId, targetLang } = parsed.data;

  const admin = createAdminClient();

  // List all chunks under dub/{sectionId}/{lang}-chunk-*.mp3
  const { data: files } = await admin.storage.from(BUCKET).list(`dub/${sectionId}`);
  if (!files) return NextResponse.json({ error: "no_files" }, { status: 404 });
  const chunkFiles = files
    .filter((f) => f.name.startsWith(`${targetLang}-chunk-`) && f.name.endsWith(".mp3"))
    .map((f) => ({
      name: f.name,
      idx: parseInt(f.name.match(/-chunk-(\d+)\.mp3$/)?.[1] ?? "-1", 10),
    }))
    .filter((f) => f.idx >= 0)
    .sort((a, b) => a.idx - b.idx);
  if (chunkFiles.length === 0) return NextResponse.json({ error: "no_chunks" }, { status: 400 });

  // Download + concat
  const bytes: Uint8Array[] = [];
  for (const cf of chunkFiles) {
    const { data: blob, error } = await admin.storage
      .from(BUCKET)
      .download(`dub/${sectionId}/${cf.name}`);
    if (error || !blob) throw new Error(`download ${cf.name}: ${error?.message}`);
    bytes.push(new Uint8Array(await blob.arrayBuffer()));
  }
  const total = bytes.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of bytes) { out.set(b, off); off += b.byteLength; }

  // Resolve section + asset
  const { data: section } = await admin
    .from("module_sections")
    .select("id, mux_asset_id")
    .eq("id", sectionId)
    .single();
  if (!section?.mux_asset_id) return NextResponse.json({ error: "no_asset" }, { status: 400 });

  // Upload final MP3 (time-stretch se aplica con script local stretch-dub.ts)
  const finalPath = `dub/${sectionId}/${targetLang}.mp3`;
  await admin.storage.from(BUCKET).upload(finalPath, out, {
    contentType: "audio/mpeg", upsert: true,
  });
  const finalUrl = admin.storage.from(BUCKET).getPublicUrl(finalPath).data.publicUrl;

  // Remove old audio track of same lang (avoid duplicates)
  const asset = await muxClient().video.assets.retrieve(section.mux_asset_id);
  for (const t of asset.tracks ?? []) {
    const tt = t as unknown as { id: string; type: string; language_code?: string };
    if (tt.type === "audio" && tt.language_code === targetLang) {
      try { await muxClient().video.assets.deleteTrack(section.mux_asset_id, tt.id); } catch {}
    }
  }

  // Attach as alternate audio
  const track = await muxClient().video.assets.createTrack(section.mux_asset_id, {
    url: finalUrl,
    ...({
      type: "audio",
      language_code: targetLang,
      name: `${LANG_NAMES[targetLang] ?? targetLang} (dub)`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mux SDK types omit alternate audio tracks
    } as any),
  });

  return NextResponse.json({
    ok: true,
    sectionId,
    targetLang,
    chunkCount: chunkFiles.length,
    totalBytes: total,
    audioUrl: finalUrl,
    trackId: (track as unknown as { id: string }).id,
  });
}
