// Test end-to-end: dispara enqueueTranslation a la NUEVA URL acts2.io
// para el video de Bloque 1 · Reino de Dios · Teaching.
// Reusa exactamente la misma lógica que app/api/webhooks/mux/route.ts.
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";
import { enqueueTranslation } from "@/lib/polyglot/client";

const SECTION_ID = "2a6420d5-bc55-48a3-adc5-3c90788524ee"; // Reino de Dios / teaching

async function main() {
  const admin = createAdminClient();
  const { data: section, error } = await admin
    .from("module_sections")
    .select("id, mux_playback_id, mux_asset_id, captions")
    .eq("id", SECTION_ID)
    .single();

  if (error) throw new Error(`Section fetch: ${error.message}`);
  if (!section.mux_playback_id) throw new Error("Sección sin mux_playback_id");
  console.log(`Section: ${SECTION_ID}`);
  console.log(`  mux_playback_id: ${section.mux_playback_id}`);
  console.log(`  mux_asset_id: ${section.mux_asset_id}`);
  console.log(`  captions actuales: ${JSON.stringify(section.captions ?? {})}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const webhookSecret = process.env.POLYGLOT_WEBHOOK_SECRET;
  if (!appUrl || !webhookSecret) throw new Error("Missing NEXT_PUBLIC_APP_URL or POLYGLOT_WEBHOOK_SECRET");
  console.log(`  app_url: ${appUrl}`);
  console.log(`  polyglot_url: ${process.env.POLYGLOT_API_URL}`);

  // Token firmado 1h (igual que el webhook)
  const raw = (await muxClient().jwt.signPlaybackId(section.mux_playback_id, {
    expiration: "3600s",
    type: "video",
  })) as unknown as Record<string, string>;
  const token = raw["playback-token"] ?? raw.video;
  if (!token) throw new Error("no playback token");
  const audioUrl = `https://stream.mux.com/${section.mux_playback_id}/audio.m4a?token=${token}`;
  console.log(`\n  audio_url generada (token 1h)`);

  console.log(`\n→ Encolando traducción a [pt] en Polyglot AI...`);
  const { jobId } = await enqueueTranslation({
    videoUrl: audioUrl,
    sourceLanguage: "es",
    targetLanguages: ["pt"],
    domainHint: "Christian theological class for pastors",
    externalRef: section.id,
    webhookUrl: `${appUrl}/api/captions-ready?secret=${encodeURIComponent(webhookSecret)}`,
  });
  console.log(`\n✅ Job encolado correctamente: ${jobId}`);
  console.log(`\nEl webhook ${appUrl}/api/captions-ready va a recibir el callback cuando termine.`);
  console.log(`Para ver el progreso: https://www.acts2.io/api/jobs/${jobId}`);
}

main().catch((e) => { console.error("\n❌ FATAL:", e.message); process.exit(1); });
