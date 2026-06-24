/**
 * Endpoint admin TODO-EN-UNO: traduce el VTT ES y genera audio doblado EN,
 * todo dentro de una sola Vercel function (maxDuration 800s).
 *
 * Bypassea Polyglot AI completamente para tener control total y debugging
 * más simple.
 *
 * Flow:
 *  1. Lee VTT ES de Mux Smart Captions
 *  2. Traduce con Claude en chunks de 30 segments (max_tokens 8K c/u)
 *  3. Sube VTT EN a Mux como text track
 *  4. Para cada chunk de ~3K chars de texto traducido: TTS native +
 *     voice changer ElevenLabs → MP3 chunk en Supabase storage
 *  5. Concatena MP3 chunks (frames binarios)
 *  6. Sube MP3 final a Supabase storage + attach a Mux como audio track
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";
import { translateAndDubSchema } from "@/lib/admin/dub-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";
const TRANSLATE_MODEL = "claude-haiku-4-5-20251001";
const SEGMENTS_PER_CHUNK = 10;
const TTS_CHUNK_CHAR_LIMIT = 3000;

const LANG_NAMES: Record<string, string> = {
  en: "English", pt: "Português", fr: "Français", de: "Deutsch",
};

type VttCue = { start: number; end: number; text: string };

function parseVtt(vtt: string): VttCue[] {
  const cues: VttCue[] = [];
  const blocks = vtt.split(/\r?\n\r?\n/);
  for (const b of blocks) {
    const lines = b.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    // Skip WEBVTT header / NOTE
    if (lines[0].startsWith("WEBVTT") || lines[0].startsWith("NOTE")) continue;
    // Skip cue id if numeric
    let idx = 0;
    if (/^\d+$/.test(lines[0].trim())) idx = 1;
    const timing = lines[idx];
    if (!timing || !timing.includes("-->")) continue;
    const [ts, te] = timing.split("-->").map((s) => s.trim());
    const text = lines.slice(idx + 1).join(" ").trim();
    if (!text) continue;
    cues.push({ start: parseTs(ts), end: parseTs(te), text });
  }
  return cues;
}

function parseTs(s: string): number {
  const m = s.match(/(\d+):(\d+):(\d+)[.,](\d+)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

function formatTs(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function buildVtt(cues: VttCue[]): string {
  return "WEBVTT\n\n" + cues.map((c, i) =>
    `${i + 1}\n${formatTs(c.start)} --> ${formatTs(c.end)}\n${c.text}`
  ).join("\n\n") + "\n";
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

const SYSTEM_PROMPT = `You are a senior subtitle translator. You translate transcripts segment-by-segment, preserving timing and natural reading pace. Rules:
1. ONE-TO-ONE: input has N numbered segments → output has exactly N elements in same order.
2. Each output element must fit comfortably in subtitle reading speed (~17 chars/sec).
3. Preserve names, biblical citations. For biblical quotes, use standard NIV (English).
4. Match tone: pastoral/teaching. Warm, direct.
5. Adapt idioms to natural English. Modern conversational language.
6. OUTPUT FORMAT: JSON only. A single JSON array of N strings, one translation per segment, in order. No markdown fence, no preface, no extra keys. Example: ["translation 1","translation 2","translation 3"]`;

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicResponse = { content: AnthropicTextBlock[] };

async function callClaude(system: string, userContent: string, attempt = 1): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: TRANSLATE_MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  // Retry on 5xx (transient Anthropic errors including 529 overloaded)
  // up to 5 times with exponential backoff
  if (!res.ok && res.status >= 500 && attempt < 5) {
    const wait = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
    await new Promise((r) => setTimeout(r, wait));
    return callClaude(system, userContent, attempt + 1);
  }
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as AnthropicResponse;
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function translateChunkWithRetry(
  chunk: VttCue[], targetLang: string, attempt = 1,
): Promise<string[]> {
  const numbered = chunk.map((c, j) => `[${j + 1}] ${c.text}`).join("\n");
  const raw = await callClaude(
    `${SYSTEM_PROMPT}\nSource: Spanish\nTarget: ${LANG_NAMES[targetLang] ?? targetLang}`,
    `Translate the following ${chunk.length} segments. Output ONLY a JSON array of EXACTLY ${chunk.length} strings. No prose before or after.\n\n${numbered}`,
  );
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const startIdx = cleaned.indexOf("[");
  const endIdx = cleaned.lastIndexOf("]");
  let translations: string[] = [];
  if (startIdx >= 0 && endIdx > startIdx) {
    try {
      const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
      if (Array.isArray(parsed)) {
        translations = parsed.map((x) => typeof x === "string" ? x.trim() : "").filter(Boolean);
      }
    } catch { /* fall through */ }
  }
  // Si tenemos menos elementos que segments y aún tenemos retries, reintentar.
  if (translations.length < chunk.length && attempt < 5) {
    await new Promise((r) => setTimeout(r, 1200 * attempt));
    return translateChunkWithRetry(chunk, targetLang, attempt + 1);
  }
  return translations;
}

async function translateCues(cues: VttCue[], targetLang: string): Promise<VttCue[]> {
  const out: VttCue[] = [];
  for (let i = 0; i < cues.length; i += SEGMENTS_PER_CHUNK) {
    const chunk = cues.slice(i, i + SEGMENTS_PER_CHUNK);
    let translations = await translateChunkWithRetry(chunk, targetLang);
    // Last-resort: si el chunk de 10 sigue fallando, traducir 1 a 1.
    if (translations.length < chunk.length) {
      translations = [];
      for (const c of chunk) {
        const t = await translateChunkWithRetry([c], targetLang);
        translations.push(t[0] ?? c.text);
      }
    }
    for (let j = 0; j < chunk.length; j++) {
      out.push({
        start: chunk[j].start,
        end: chunk[j].end,
        text: translations[j] ?? chunk[j].text,
      });
    }
  }
  return out;
}

async function ttsChunk(text: string, targetVoice: string, nativeVoice: string, apiKey: string): Promise<Uint8Array> {
  // Step 1: TTS with native voice
  const ttsRes = await fetch(`${ELEVENLABS_API}/text-to-speech/${nativeVoice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
    }),
  });
  if (!ttsRes.ok) throw new Error(`TTS native (${ttsRes.status}): ${(await ttsRes.text()).slice(0, 200)}`);
  const nativeAudio = new Uint8Array(await ttsRes.arrayBuffer());

  // Step 2: Voice Changer with cloned voice
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(nativeAudio)], { type: "audio/mpeg" }), "src.mp3");
  form.append("model_id", "eleven_multilingual_sts_v2");
  form.append("voice_settings", JSON.stringify({
    stability: 0.5, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true,
  }));
  const vcRes = await fetch(`${ELEVENLABS_API}/speech-to-speech/${targetVoice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, accept: "audio/mpeg" },
    body: form,
  });
  if (!vcRes.ok) throw new Error(`VoiceChanger (${vcRes.status}): ${(await vcRes.text()).slice(0, 200)}`);
  return new Uint8Array(await vcRes.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("[translate-and-dub] handler_exception:", e);
    return NextResponse.json({
      error: "handler_exception",
      message: (e as Error).message,
    }, { status: 500 });
  }
}

async function handle(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = translateAndDubSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { sectionId, targetLang, skipDub } = parsed.data;

  const admin = createAdminClient();
  const { data: section } = await admin
    .from("module_sections")
    .select("id, mux_playback_id, mux_asset_id")
    .eq("id", sectionId)
    .single();
  if (!section?.mux_asset_id || !section.mux_playback_id) {
    return NextResponse.json({ error: "no_video" }, { status: 400 });
  }

  // 1. Find ES track + download VTT
  const asset = await muxClient().video.assets.retrieve(section.mux_asset_id);
  const esTrack = (asset.tracks ?? []).find((t) => {
    const tt = t as unknown as { type: string; language_code?: string; status?: string };
    return tt.type === "text" && tt.language_code === "es" && tt.status === "ready";
  }) as unknown as { id: string } | undefined;
  if (!esTrack) return NextResponse.json({ error: "no_es_captions" }, { status: 400 });

  const tokenRaw = (await muxClient().jwt.signPlaybackId(section.mux_playback_id, {
    expiration: "600s",
    type: ["video"],
  })) as unknown as Record<string, string>;
  const token = tokenRaw["playback-token"] ?? tokenRaw.video;
  const vttUrl = `https://stream.mux.com/${section.mux_playback_id}/text/${esTrack.id}.vtt?token=${token}`;
  const vttRes = await fetch(vttUrl);
  if (!vttRes.ok) return NextResponse.json({ error: `vtt_${vttRes.status}` }, { status: 502 });
  const esVtt = await vttRes.text();
  const esCues = parseVtt(esVtt);

  // 2. Translate cues
  const translatedCues = await translateCues(esCues, targetLang);
  const translatedVtt = buildVtt(translatedCues);

  // Sanity check: ensure no ES leak. Count cues that are identical to ES (fallback hit).
  const fallbackCount = translatedCues.filter((c, i) => c.text === esCues[i]?.text).length;

  // 3. Remove old tracks (text + audio) for this lang
  const oldTracks = (asset.tracks ?? []).filter((t) => {
    const tt = t as unknown as { type: string; language_code?: string };
    return (tt.type === "text" || tt.type === "audio") && tt.language_code === targetLang;
  });
  for (const t of oldTracks) {
    const tt = t as unknown as { id: string };
    try { await muxClient().video.assets.deleteTrack(section.mux_asset_id, tt.id); } catch {}
  }

  // 4. Upload translated VTT to Supabase storage (Mux fetches it from there)
  const vttPath = `dub/${section.id}/${targetLang}.vtt`;
  await admin.storage.from("captions").upload(vttPath, translatedVtt, {
    contentType: "text/vtt", upsert: true,
  });
  const publicVttUrl = admin.storage.from("captions").getPublicUrl(vttPath).data.publicUrl;

  // 5. Attach text track to Mux
  const textTrack = await muxClient().video.assets.createTrack(section.mux_asset_id, {
    url: publicVttUrl,
    type: "text",
    text_type: "subtitles",
    language_code: targetLang,
    name: LANG_NAMES[targetLang] ?? targetLang,
    closed_captions: false,
  });

  // 6. Dub (optional)
  let audioPublicUrl: string | null = null;
  let dubChunkCount = 0;
  if (!skipDub) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const targetVoice = process.env.ELEVENLABS_DUB_VOICE_ID;
    const nativeVoice = process.env[`ELEVENLABS_NATIVE_VOICE_${targetLang.toUpperCase()}`];
    if (!apiKey || !targetVoice || !nativeVoice) {
      return NextResponse.json({
        ok: true,
        warning: "audio_skipped_missing_env",
        cuesTranslated: translatedCues.length,
        fallbackCount,
        textTrackId: (textTrack as unknown as { id: string }).id,
      });
    }
    const fullText = translatedCues.map((c) => c.text).join(" ");
    const textChunks = chunkText(fullText, TTS_CHUNK_CHAR_LIMIT);
    dubChunkCount = textChunks.length;

    const audioBlobs: Uint8Array[] = [];
    for (let i = 0; i < textChunks.length; i++) {
      const audio = await ttsChunk(textChunks[i], targetVoice, nativeVoice, apiKey);
      audioBlobs.push(audio);
    }
    const totalLen = audioBlobs.reduce((s, b) => s + b.byteLength, 0);
    const concatenated = new Uint8Array(totalLen);
    let off = 0;
    for (const b of audioBlobs) { concatenated.set(b, off); off += b.byteLength; }

    const audioPath = `dub/${section.id}/${targetLang}.mp3`;
    await admin.storage.from("captions").upload(audioPath, concatenated, {
      contentType: "audio/mpeg", upsert: true,
    });
    audioPublicUrl = admin.storage.from("captions").getPublicUrl(audioPath).data.publicUrl;

    await muxClient().video.assets.createTrack(section.mux_asset_id, {
      url: audioPublicUrl,
      ...({
        type: "audio", language_code: targetLang,
        name: `${LANG_NAMES[targetLang] ?? targetLang} (dub)`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mux SDK types omit alternate audio tracks
      } as any),
    });
  }

  return NextResponse.json({
    ok: true,
    sectionId,
    targetLang,
    cuesTranslated: translatedCues.length,
    fallbackCount,
    textTrackId: (textTrack as unknown as { id: string }).id,
    vttUrl: publicVttUrl,
    audioUrl: audioPublicUrl,
    dubChunkCount,
  });
}
