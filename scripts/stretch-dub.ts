/**
 * Time-stretching del audio dub para sincronizar con la duración del
 * video original. Usa ffmpeg local (filter atempo, preserva pitch).
 *
 * Uso:
 *   npx tsx scripts/stretch-dub.ts <sectionId> [lang=en]
 *
 * Flow:
 *  1. Lee duración del video Mux (sourceSec)
 *  2. Descarga el MP3 dub de Supabase storage (dub/{sectionId}/{lang}.mp3)
 *  3. Calcula duración actual (ffprobe)
 *  4. Si la diferencia > 3%, aplica atempo clampeado a [0.91, 1.10]
 *  5. Sube el resultado de vuelta
 *  6. Re-attach a Mux (borra audio antiguo de ese lang, crea nuevo)
 */
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";

const BUCKET = "captions";
const TEMPO_MIN = 0.91;
const TEMPO_MAX = 1.10;
const TEMPO_TRIGGER = 0.03; // 3%

const LANG_NAMES: Record<string, string> = {
  en: "English", pt: "Português", fr: "Français", de: "Deutsch",
};

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => stdout += d.toString());
    proc.stderr.on("data", (d) => stderr += d.toString());
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout + stderr);
      else reject(new Error(`${cmd} exit ${code}: ${stderr.slice(-300)}`));
    });
  });
}

async function probeDuration(path: string): Promise<number> {
  const out = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", path,
  ]);
  return parseFloat(out.trim());
}

async function main() {
  const sectionId = process.argv[2];
  const lang = process.argv[3] ?? "en";
  if (!sectionId) { console.error("Usage: stretch-dub.ts <sectionId> [lang]"); process.exit(1); }

  const admin = createAdminClient();
  const { data: section } = await admin
    .from("module_sections")
    .select("id, mux_asset_id, duration_seconds")
    .eq("id", sectionId)
    .single<{ id: string; mux_asset_id: string; duration_seconds: number | null }>();
  if (!section?.mux_asset_id) throw new Error("section sin mux_asset_id");

  // 1. Duración del video original (Mux)
  let sourceSec = section.duration_seconds ?? 0;
  if (!sourceSec) {
    const asset = await muxClient().video.assets.retrieve(section.mux_asset_id);
    sourceSec = asset.duration ?? 0;
  }
  if (!sourceSec) throw new Error("no source duration");
  console.log(`Video original: ${sourceSec.toFixed(2)}s`);

  // 2. Descargar dub actual
  const dubPath = `dub/${sectionId}/${lang}.mp3`;
  const { data: blob, error } = await admin.storage.from(BUCKET).download(dubPath);
  if (error || !blob) throw new Error(`download dub: ${error?.message}`);
  const dir = await mkdtemp(join(tmpdir(), "dub-stretch-"));
  const inPath = join(dir, "in.mp3");
  const outPath = join(dir, "out.mp3");
  await writeFile(inPath, new Uint8Array(await blob.arrayBuffer()));

  // 3. Duración actual del dub (ffprobe real)
  const dubSec = await probeDuration(inPath);
  console.log(`Dub actual: ${dubSec.toFixed(2)}s`);

  // 4. Calcular tempo
  const ratio = dubSec / sourceSec;
  console.log(`Ratio dub/source: ${ratio.toFixed(4)}`);
  if (Math.abs(ratio - 1) < TEMPO_TRIGGER) {
    console.log(`✓ Diferencia <${TEMPO_TRIGGER * 100}%, no se aplica stretch`);
    await unlink(inPath).catch(() => {});
    return;
  }
  let tempo = ratio;
  let clamped = false;
  if (tempo < TEMPO_MIN) { tempo = TEMPO_MIN; clamped = true; }
  if (tempo > TEMPO_MAX) { tempo = TEMPO_MAX; clamped = true; }
  console.log(`atempo: ${tempo.toFixed(4)}${clamped ? " (CLAMPED)" : ""}`);

  // 5. Aplicar atempo
  const tempPath = join(dir, "stretched.mp3");
  await run("ffmpeg", [
    "-y", "-i", inPath,
    "-filter:a", `atempo=${tempo.toFixed(4)}`,
    "-codec:a", "libmp3lame", "-b:a", "128k",
    tempPath,
  ]);
  let stretchedSec = await probeDuration(tempPath);
  console.log(`Dub post-atempo: ${stretchedSec.toFixed(2)}s`);

  // 6. Si aún falta para matchear source (atempo clampeado), padding de
  //    silencio al final. La voz termina cuando termina la enseñanza, el
  //    silencio cubre el resto del video sin generar gap perceptible.
  const gap = sourceSec - stretchedSec;
  if (Math.abs(gap) > 0.5) {
    if (gap > 0) {
      console.log(`Padding ${gap.toFixed(2)}s de silencio al final...`);
      await run("ffmpeg", [
        "-y", "-i", tempPath,
        "-af", `apad=pad_dur=${gap.toFixed(3)}`,
        "-codec:a", "libmp3lame", "-b:a", "128k",
        outPath,
      ]);
    } else {
      // Dub excede el video: truncar
      console.log(`Truncando ${(-gap).toFixed(2)}s del final...`);
      await run("ffmpeg", [
        "-y", "-i", tempPath, "-t", sourceSec.toFixed(3),
        "-codec:a", "libmp3lame", "-b:a", "128k",
        outPath,
      ]);
    }
  } else {
    await run("ffmpeg", ["-y", "-i", tempPath, "-c", "copy", outPath]);
  }
  const newSec = await probeDuration(outPath);
  console.log(`Dub final: ${newSec.toFixed(2)}s (diff con source: ${(newSec - sourceSec).toFixed(2)}s)`);

  // 6. Subir a Supabase (overwrite)
  const newBytes = new Uint8Array(await readFile(outPath));
  await admin.storage.from(BUCKET).upload(dubPath, newBytes, {
    contentType: "audio/mpeg", upsert: true,
  });
  console.log(`✓ uploaded (${(newBytes.byteLength / 1024 / 1024).toFixed(2)} MB)`);

  // 7. Re-attach a Mux: borrar audio lang viejo + crear nuevo apuntando al URL nuevo
  const asset = await muxClient().video.assets.retrieve(section.mux_asset_id);
  for (const t of asset.tracks ?? []) {
    const tt = t as unknown as { id: string; type: string; language_code?: string };
    if (tt.type === "audio" && tt.language_code === lang) {
      try {
        await muxClient().video.assets.deleteTrack(section.mux_asset_id, tt.id);
        console.log(`  · borrado audio antiguo ${tt.id.slice(0, 12)}`);
      } catch (e) { console.warn(`  ⚠ delete: ${(e as Error).message}`); }
    }
  }
  const finalUrl = admin.storage.from(BUCKET).getPublicUrl(dubPath).data.publicUrl;
  const track = await muxClient().video.assets.createTrack(section.mux_asset_id, {
    url: finalUrl,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ type: "audio", language_code: lang, name: `${LANG_NAMES[lang] ?? lang} (dub)` } as any),
  });
  console.log(`✓ re-attached a Mux track ${(track as unknown as { id: string }).id.slice(0, 12)}`);

  await unlink(inPath).catch(() => {});
  await unlink(outPath).catch(() => {});
  console.log(`\n✅ Listo. atempo=${tempo.toFixed(4)} aplicado.`);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
