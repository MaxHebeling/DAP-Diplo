// Uso: pnpm exec tsx scripts/backfill-mux-signed-policy.ts [--dry-run]
//
// Reconvierte todos los assets de Mux que están con policy="public" a
// policy="signed". Por cada sección con mux_asset_id:
//   1. Lee los playback_ids actuales del asset
//   2. Si ya tiene uno "signed" → actualiza la fila para usarlo y borra
//      el público (limpio)
//   3. Si no tiene signed → crea uno nuevo signed, lo guarda en la fila
//      y luego borra el público
//
// Idempotente: corre múltiples veces sin efectos colaterales.
// Lee las mismas env vars que el server (MUX_TOKEN_*, MUX_SIGNING_KEY/PRIVATE_KEY).

import { config } from "dotenv";
config({ path: ".env.local" });

import Mux from "@mux/mux-node";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Falta env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const mux = new Mux({
  tokenId: env("MUX_TOKEN_ID"),
  tokenSecret: env("MUX_TOKEN_SECRET"),
});

const supabase = createClient(
  env("NEXT_PUBLIC_SUPABASE_URL"),
  env("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);

type Row = {
  id: string;
  mux_asset_id: string;
  mux_playback_id: string | null;
};

async function main() {
  console.log(DRY_RUN ? "MODO DRY-RUN (no se modifica nada)" : "MODO LIVE");

  const { data, error } = await supabase
    .from("module_sections")
    .select("id, mux_asset_id, mux_playback_id")
    .not("mux_asset_id", "is", null);

  if (error) throw error;
  const rows = (data ?? []) as Row[];
  console.log(`Encontradas ${rows.length} secciones con mux_asset_id.`);

  let migrated = 0;
  let alreadySigned = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const asset = await mux.video.assets.retrieve(row.mux_asset_id);
      const playbackIds = asset.playback_ids ?? [];
      const signed = playbackIds.find((p) => p.policy === "signed");
      const publicOne = playbackIds.find((p) => p.policy === "public");

      // Caso A: ya tiene signed y la fila ya apunta a él → nada que hacer.
      if (signed && row.mux_playback_id === signed.id && !publicOne) {
        alreadySigned += 1;
        continue;
      }

      // Caso B: necesita signed. Crear si no existe.
      let signedId = signed?.id;
      if (!signedId) {
        if (DRY_RUN) {
          console.log(
            `[dry] crearía signed playback_id en asset ${row.mux_asset_id}`,
          );
          signedId = "(would-create)";
        } else {
          const created = await mux.video.assets.createPlaybackId(
            row.mux_asset_id,
            { policy: "signed" },
          );
          signedId = created.id;
          console.log(
            `  + Asset ${row.mux_asset_id}: nuevo signed playback_id ${signedId}`,
          );
        }
      }

      // Caso C: actualizar fila para apuntar al signed.
      if (row.mux_playback_id !== signedId && !DRY_RUN) {
        const { error: upErr } = await supabase
          .from("module_sections")
          .update({ mux_playback_id: signedId })
          .eq("id", row.id);
        if (upErr) throw upErr;
        console.log(
          `  ~ Sección ${row.id}: mux_playback_id → ${signedId}`,
        );
      }

      // Caso D: borrar el public si existe.
      if (publicOne) {
        if (DRY_RUN) {
          console.log(
            `[dry] borraría public playback_id ${publicOne.id} de asset ${row.mux_asset_id}`,
          );
        } else {
          await mux.video.assets.deletePlaybackId(
            row.mux_asset_id,
            publicOne.id,
          );
          console.log(
            `  - Asset ${row.mux_asset_id}: removed public playback_id ${publicOne.id}`,
          );
        }
      }

      migrated += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `[fail] sección ${row.id} (asset ${row.mux_asset_id}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Total:           ${rows.length}`);
  console.log(`Ya signed (skip):${alreadySigned}`);
  console.log(`Migrados:        ${migrated}`);
  console.log(`Fallaron:        ${failed}`);
  console.log(DRY_RUN ? "\n(dry-run, sin cambios reales)" : "\nListo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
