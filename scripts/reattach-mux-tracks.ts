// Re-attacha los VTT (subtítulos) generados por Polyglot al asset Mux.
// Idempotente: si Mux ya tiene un track con ese language_code, lo skipea.
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient } from "@/lib/mux/server";

const SECTION_ID = "2a6420d5-bc55-48a3-adc5-3c90788524ee"; // Reino de Dios / teaching

const LANG_NAMES: Record<string, string> = {
  en: "English", pt: "Português", fr: "Français", de: "Deutsch",
  it: "Italiano", ko: "한국어", ja: "日本語", zh: "中文",
};

async function main() {
  const admin = createAdminClient();
  const { data: section } = await admin
    .from("module_sections")
    .select("id, mux_asset_id, captions")
    .eq("id", SECTION_ID)
    .single();
  if (!section?.mux_asset_id) throw new Error("Sin mux_asset_id");
  const captions = (section.captions as Record<string, string>) ?? {};
  console.log(`Section: ${section.id}`);
  console.log(`  asset: ${section.mux_asset_id}`);
  console.log(`  captions DB: ${Object.keys(captions).join(", ")}`);

  const mux = muxClient();
  const asset = await mux.video.assets.retrieve(section.mux_asset_id);
  const existingLangs = new Set(
    (asset.tracks ?? [])
      .filter((t) => (t as unknown as { type: string }).type === "text")
      .map((t) => (t as unknown as { language_code?: string }).language_code)
      .filter(Boolean) as string[],
  );
  console.log(`  Tracks de texto ya attachados: [${[...existingLangs].join(", ")}]`);

  for (const [lang, vttUrl] of Object.entries(captions)) {
    if (existingLangs.has(lang)) {
      console.log(`  · ${lang}: ya attachado, skip`);
      continue;
    }
    if (!vttUrl) continue;
    console.log(`  · ${lang}: attaching VTT...`);
    try {
      const result = await mux.video.assets.createTrack(section.mux_asset_id, {
        url: vttUrl,
        type: "text",
        text_type: "subtitles",
        language_code: lang,
        name: LANG_NAMES[lang] ?? lang.toUpperCase(),
        closed_captions: false,
      });
      console.log(`    ✓ track creado: ${(result as unknown as { id: string }).id}`);
    } catch (e) {
      console.error(`    ❌ ${(e as Error).message}`);
    }
  }
  console.log("\n✅ Listo.");
}

main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
