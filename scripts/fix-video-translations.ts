// FIX: el video del 23 jun no tiene job propio en Polyglot.
// Las captions guardadas en DB son de un video viejo (mayo).
// 1) Remueve los text tracks erróneos del asset Mux
// 2) Limpia captions del DB
// 3) Encola job nuevo en Polyglot AI con TTS habilitado
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";
import { enqueueTranslation } from "@/lib/polyglot/client";

const SECTION_ID = "2a6420d5-bc55-48a3-adc5-3c90788524ee";

async function main() {
  const admin = createAdminClient();
  const { data: section } = await admin
    .from("module_sections")
    .select("id, mux_playback_id, mux_asset_id, captions, captions_job_id")
    .eq("id", SECTION_ID)
    .single();
  if (!section?.mux_asset_id) throw new Error("Sin mux_asset_id");
  console.log(`Section: ${section.id}`);
  console.log(`  asset: ${section.mux_asset_id}`);
  console.log(`  playback: ${section.mux_playback_id}`);

  // 1) Quitar text tracks viejos del asset Mux
  const mux = muxClient();
  const asset = await mux.video.assets.retrieve(section.mux_asset_id);
  const textTracks = (asset.tracks ?? []).filter(
    (t) => (t as unknown as { type: string }).type === "text",
  );
  console.log(`\n  Text tracks a remover: ${textTracks.length}`);
  for (const t of textTracks) {
    const tt = t as unknown as { id: string; language_code?: string };
    try {
      await mux.video.assets.deleteTrack(section.mux_asset_id, tt.id);
      console.log(`    ✓ removido lang=${tt.language_code} id=${tt.id.slice(0, 12)}`);
    } catch (e) {
      console.error(`    ❌ ${tt.id}: ${(e as Error).message}`);
    }
  }

  // 2) Limpiar captions del DB
  await admin
    .from("module_sections")
    .update({ captions: {}, captions_job_id: null })
    .eq("id", section.id);
  console.log(`  ✓ captions DB limpiadas`);

  // 3) Disparar nuevo job en Polyglot
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookSecret = process.env.POLYGLOT_WEBHOOK_SECRET;
  if (!appUrl || !webhookSecret) throw new Error("Missing NEXT_PUBLIC_APP_URL or POLYGLOT_WEBHOOK_SECRET");

  const raw = (await mux.jwt.signPlaybackId(section.mux_playback_id, {
    expiration: "3600s",
    type: ["video"],
  })) as unknown as Record<string, string>;
  console.log("  raw signed:", JSON.stringify(raw).slice(0, 200));
  const token = raw["playback-token"] ?? raw.video ?? Object.values(raw)[0];
  if (!token) throw new Error("no playback token");
  const audioUrl = `https://stream.mux.com/${section.mux_playback_id}/audio.m4a?token=${token}`;

  console.log(`\n→ Encolando job en Polyglot (TTS habilitado server-side)...`);
  const { jobId } = await enqueueTranslation({
    videoUrl: audioUrl,
    sourceLanguage: "es",
    targetLanguages: ["en", "pt"],
    domainHint: "Christian theological class for pastors",
    externalRef: section.id,
    webhookUrl: `${appUrl}/api/captions-ready?secret=${encodeURIComponent(webhookSecret)}`,
  });
  console.log(`\n✅ Job encolado: ${jobId}`);
  console.log(`   Ver progreso: https://www.acts2.io/api/jobs/${jobId}`);
  console.log(`   Cuando termine, captions-ready hace attach de VTT + audio a Mux.`);
}

main().catch((e) => { console.error("\n❌ FATAL:", e.message); process.exit(1); });
