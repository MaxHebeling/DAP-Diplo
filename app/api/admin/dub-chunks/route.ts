/**
 * Genera 1 chunk de audio dub (TTS native + voice changer) y lo sube a
 * Supabase storage. Diseñado para llamarse N veces (1 por chunk) hasta
 * completar todo el audio. Cada call entra en 300s.
 *
 * POST /api/admin/dub-chunks
 * Body: { sectionId, targetLang, chunkIndex }
 *
 * Devuelve: { ok, totalChunks, chunkIndex, chunkPath, sizeBytes }
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dubChunksSchema } from "@/lib/admin/dub-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";
const TTS_CHUNK_CHAR_LIMIT = 3000;
const BUCKET = "captions";

type VttCue = { start: number; end: number; text: string };

function parseVtt(vtt: string): VttCue[] {
  const cues: VttCue[] = [];
  const blocks = vtt.split(/\r?\n\r?\n/);
  for (const b of blocks) {
    const lines = b.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    if (lines[0].startsWith("WEBVTT") || lines[0].startsWith("NOTE")) continue;
    let idx = 0;
    if (/^\d+$/.test(lines[0].trim())) idx = 1;
    const timing = lines[idx];
    if (!timing || !timing.includes("-->")) continue;
    const text = lines.slice(idx + 1).join(" ").trim();
    if (!text) continue;
    cues.push({ start: 0, end: 0, text });
  }
  return cues;
}

function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let rem = text;
  while (rem.length > max) {
    let cut = rem.lastIndexOf(". ", max);
    if (cut < max * 0.6) cut = rem.lastIndexOf(" ", max);
    if (cut < 1) cut = max;
    out.push(rem.slice(0, cut + 1).trim());
    rem = rem.slice(cut + 1).trim();
  }
  if (rem) out.push(rem);
  return out;
}

async function ttsAndVC(text: string, targetVoice: string, _nativeVoice: string, apiKey: string): Promise<Uint8Array> {
  // FASE 1 (jun 2026): TTS directo con PVC del usuario en modelo
  // multilingual. Salteamos el voice changer porque introducía la
  // prosodia de Brian (americano nativo) y quedaba "Max con cadencia
  // forzada". Ahora el PVC genera EN con la prosodia propia del clone
  // — suena más natural y conserva personalidad vocal.
  //
  // Settings tuneados para PVC multilingual:
  //   stability 0.5 → balance entre consistencia y expresividad
  //   similarity_boost 0.95 → max fidelidad al clone source
  //   style 0.0 → no exagerar (PVC ya tiene estilo del orador)
  const ttsRes = await fetch(`${ELEVENLABS_API}/text-to-speech/${targetVoice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.95, style: 0.0, use_speaker_boost: true },
    }),
  });
  if (!ttsRes.ok) throw new Error(`TTS PVC (${ttsRes.status}): ${(await ttsRes.text()).slice(0, 200)}`);
  return new Uint8Array(await ttsRes.arrayBuffer());
}

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
  const parsed = dubChunksSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { sectionId, targetLang, chunkIndex } = parsed.data;

  const admin = createAdminClient();

  // 1. Descargar VTT EN ya generado
  const vttPath = `dub/${sectionId}/${targetLang}.vtt`;
  const { data: vttBlob, error: dErr } = await admin.storage.from(BUCKET).download(vttPath);
  if (dErr || !vttBlob) return NextResponse.json({ error: `vtt_download: ${dErr?.message ?? "no_blob"}` }, { status: 404 });
  const vtt = await vttBlob.text();
  const cues = parseVtt(vtt);
  const fullText = cues.map((c) => c.text).join(" ");
  const chunks = chunkText(fullText, TTS_CHUNK_CHAR_LIMIT);

  if (chunkIndex < 0 || chunkIndex >= chunks.length) {
    return NextResponse.json({ error: "invalid_chunk", totalChunks: chunks.length }, { status: 400 });
  }

  // 2. Check if this chunk already exists (idempotent)
  const chunkPath = `dub/${sectionId}/${targetLang}-chunk-${chunkIndex}.mp3`;
  const { data: existing } = await admin.storage.from(BUCKET).download(chunkPath);
  if (existing) {
    return NextResponse.json({
      ok: true, totalChunks: chunks.length, chunkIndex, chunkPath,
      sizeBytes: existing.size, cached: true,
    });
  }

  // 3. Generate
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const targetVoice = process.env.ELEVENLABS_DUB_VOICE_ID!;
  const nativeVoice = process.env[`ELEVENLABS_NATIVE_VOICE_${targetLang.toUpperCase()}`]!;
  if (!apiKey || !targetVoice || !nativeVoice) {
    return NextResponse.json({ error: "missing_env" }, { status: 500 });
  }

  const audio = await ttsAndVC(chunks[chunkIndex], targetVoice, nativeVoice, apiKey);
  await admin.storage.from(BUCKET).upload(chunkPath, audio, {
    contentType: "audio/mpeg", upsert: true,
  });

  return NextResponse.json({
    ok: true, totalChunks: chunks.length, chunkIndex, chunkPath,
    sizeBytes: audio.byteLength, cached: false,
    chunkCharLength: chunks[chunkIndex].length,
  });
}
