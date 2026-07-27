import { muxClient } from "@/lib/mux/server";

async function main() {
  const assetId = "01j00J2QpCroxeiKY8qCu8X3h3TJpD5BOxQYHvsqVTJvE";
  const asset = await muxClient().video.assets.retrieve(assetId);
  console.log(`Asset ${assetId}`);
  console.log(`  status: ${asset.status} · duration: ${Math.round(asset.duration ?? 0)}s`);
  console.log(`\nTracks (${asset.tracks?.length ?? 0}):`);
  for (const t of asset.tracks ?? []) {
    const tt = t as unknown as Record<string, unknown>;
    console.log(
      `  · type=${tt.type} lang=${tt.language_code ?? "-"} name="${tt.name ?? "-"}" status=${tt.status ?? "-"} id=${(tt.id as string)?.slice(0, 12)}`,
    );
  }
}
main().catch((e) => { console.error("ERR:", e); process.exit(1); });
