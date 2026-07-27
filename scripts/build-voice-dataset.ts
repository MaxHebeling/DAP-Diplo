/**
 * Construye un dataset de audio limpio para entrenar un Professional
 * Voice Clone (PVC) en ElevenLabs.
 *
 * Uso:
 *   npx tsx scripts/build-voice-dataset.ts <input-dir> [output.mp3]
 *
 * Input: directorio con .mp4 / .mov / .m4a / .mp3 / .wav (mezclados ok).
 * Output: MP3 mono 22050Hz ~96 kbps listo para subir a ElevenLabs
 *         Voice Lab → Add Voice → Professional Voice Clone.
 *
 * Pipeline:
 *  1. Para cada archivo: extraer audio mono 22050Hz
 *  2. (Opcional) Aislar voz con Demucs si está instalado (pip install demucs)
 *  3. Loudness-normalizar (-16 LUFS, broadcast standard)
 *  4. Concatenar todo
 *  5. Reportar duración total
 *
 * Recomendación ElevenLabs PVC:
 *  - Mínimo: 30 min de audio limpio
 *  - Óptimo: 2-3 horas
 *  - El audio debe ser SOLO la voz del orador (sin música/ruido)
 *  - Un solo idioma fuente (español, por consistencia)
 */
import { spawn } from "node:child_process";
import { readdir, mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

const ACCEPTED_EXT = [".mp4", ".mov", ".m4a", ".mp3", ".wav", ".webm", ".mkv"];

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    proc.stdout.on("data", (d) => out += d.toString());
    proc.stderr.on("data", (d) => err += d.toString());
    proc.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} exit ${code}: ${err.slice(-200)}`));
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

async function hasDemucs(): Promise<boolean> {
  try { await run("which", ["demucs"]); return true; } catch { return false; }
}

async function extractAudio(input: string, output: string) {
  // mono 22050Hz — formato óptimo PVC ElevenLabs (low bandwidth, full voice)
  await run("ffmpeg", [
    "-y", "-i", input, "-vn",
    "-ac", "1", "-ar", "22050",
    "-codec:a", "libmp3lame", "-b:a", "96k",
    output,
  ]);
}

async function isolateVoiceDemucs(input: string, outputDir: string): Promise<string> {
  // Demucs separa stems. Output: outputDir/htdemucs/<filename>/vocals.wav
  await run("demucs", ["-n", "htdemucs", "-o", outputDir, "--two-stems", "vocals", input]);
  const stem = basename(input, ".mp3");
  const vocalsPath = join(outputDir, "htdemucs", stem, "vocals.wav");
  if (!existsSync(vocalsPath)) throw new Error(`demucs no produjo vocals.wav en ${vocalsPath}`);
  return vocalsPath;
}

async function normalizeLoudness(input: string, output: string) {
  // Loudness target -16 LUFS (broadcast standard ElevenLabs friendly)
  await run("ffmpeg", [
    "-y", "-i", input,
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
    "-codec:a", "libmp3lame", "-b:a", "96k",
    output,
  ]);
}

async function concatFiles(files: string[], output: string, workDir: string) {
  // ffmpeg concat demuxer requiere un manifest file
  const manifest = join(workDir, "concat.txt");
  const lines = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n");
  await writeFile(manifest, lines);
  await run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", manifest,
    "-codec:a", "libmp3lame", "-b:a", "96k",
    output,
  ]);
  await unlink(manifest).catch(() => {});
}

async function main() {
  const inputDir = process.argv[2];
  const outputPath = process.argv[3] ?? "voice-dataset.mp3";
  if (!inputDir) {
    console.error("Usage: build-voice-dataset.ts <input-dir> [output.mp3]");
    process.exit(1);
  }
  if (!existsSync(inputDir)) {
    console.error(`Input dir no existe: ${inputDir}`);
    process.exit(1);
  }

  console.log(`📂 Input dir: ${inputDir}`);
  console.log(`🎯 Output:    ${outputPath}\n`);

  const files = (await readdir(inputDir))
    .filter((f) => ACCEPTED_EXT.includes(f.toLowerCase().slice(f.lastIndexOf("."))))
    .map((f) => join(inputDir, f));
  if (!files.length) {
    console.error(`No se encontraron archivos ${ACCEPTED_EXT.join(", ")}`);
    process.exit(1);
  }
  console.log(`📹 ${files.length} archivos encontrados:`);
  for (const f of files) console.log(`   · ${basename(f)}`);

  const useDemucs = await hasDemucs();
  console.log(`\n🎙️  Demucs (voice isolation): ${useDemucs ? "✓ disponible" : "✗ no instalado (omite isolation; instala con: pip install demucs)"}`);

  const workDir = join("/tmp", `voice-dataset-${Date.now()}`);
  await mkdir(workDir, { recursive: true });

  const intermediateFiles: string[] = [];
  let totalSec = 0;

  for (let i = 0; i < files.length; i++) {
    const src = files[i];
    const tag = `[${i + 1}/${files.length}]`;
    console.log(`\n${tag} ${basename(src)}`);

    // 1. Extract audio
    const audioPath = join(workDir, `${i}-audio.mp3`);
    await extractAudio(src, audioPath);
    let dur = await probeDuration(audioPath);
    console.log(`   ✓ audio extraído (${dur.toFixed(1)}s)`);

    // 2. (opcional) demucs voice isolation
    let cleanPath = audioPath;
    if (useDemucs) {
      try {
        const vocals = await isolateVoiceDemucs(audioPath, workDir);
        cleanPath = vocals;
        console.log(`   ✓ voz aislada (demucs)`);
      } catch (e) {
        console.warn(`   ⚠ demucs falló: ${(e as Error).message}, uso audio raw`);
      }
    }

    // 3. Normalize loudness
    const normPath = join(workDir, `${i}-norm.mp3`);
    await normalizeLoudness(cleanPath, normPath);
    dur = await probeDuration(normPath);
    console.log(`   ✓ loudness normalizado (-16 LUFS)`);
    intermediateFiles.push(normPath);
    totalSec += dur;
  }

  // 4. Concat
  console.log(`\n🔗 Concatenando ${intermediateFiles.length} archivos...`);
  await concatFiles(intermediateFiles, outputPath, workDir);
  const finalDur = await probeDuration(outputPath);
  const finalSize = (await stat(outputPath)).size;

  console.log(`\n✅ Dataset listo:`);
  console.log(`   📄 ${outputPath}`);
  console.log(`   ⏱  duración: ${(finalDur / 60).toFixed(1)} min (${finalDur.toFixed(0)}s)`);
  console.log(`   📦 tamaño:   ${(finalSize / 1024 / 1024).toFixed(2)} MB`);

  const recommendation =
    finalDur < 30 * 60 ? "⚠ Recomendado mínimo 30 min para PVC, IVC OK"
    : finalDur < 2 * 60 * 60 ? "✓ OK para PVC básico (más es mejor)"
    : "🏆 Dataset robusto — PVC va a ser premium";
  console.log(`   ${recommendation}\n`);
  console.log(`Próximo paso: subí ${outputPath} a https://elevenlabs.io/app/voice-lab → Add Voice → Professional Voice Clone.`);
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
