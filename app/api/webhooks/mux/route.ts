import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { muxClient, muxWebhookSecret } from "@/lib/mux/server";

export const runtime = "nodejs";

// Eventos esperados (configurados en Mux Dashboard apuntando a esta URL):
//   - video.upload.asset_created
//   - video.asset.ready
//
// Lookup de sección: priorizamos `passthrough` (que seteamos como section.id
// al crear el upload). Como fallback, también buscamos por `mux_upload_id`
// para upload.asset_created y por `mux_asset_id` para asset.ready.

type SectionLookup = {
  id: string;
  module_id: string;
  mux_asset_id: string | null;
};

async function findSection(
  admin: ReturnType<typeof createAdminClient>,
  column: "id" | "mux_upload_id" | "mux_asset_id",
  value: string,
): Promise<SectionLookup | null> {
  const { data } = await admin
    .from("module_sections")
    .select("id, module_id, mux_asset_id")
    .eq(column, value)
    .maybeSingle();
  return data ?? null;
}

// Borra el asset viejo en Mux cuando una sección recibe uno nuevo
// (re-upload sobre la misma sección). Evita cost leak por huérfanos.
// Best-effort: si la API de Mux falla, log y seguimos — no rompemos el
// procesamiento del webhook por un cleanup.
async function deleteMuxAssetIfOrphan(
  oldAssetId: string | null,
  newAssetId: string,
): Promise<void> {
  if (!oldAssetId || oldAssetId === newAssetId) return;
  try {
    await muxClient().video.assets.delete(oldAssetId);
    console.log(
      `[mux.webhook] cleanup: deleted orphan asset ${oldAssetId} (replaced by ${newAssetId})`,
    );
  } catch (err) {
    console.error(
      `[mux.webhook] cleanup failed for asset ${oldAssetId}:`,
      err,
    );
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let event;
  try {
    event = await muxClient().webhooks.unwrap(
      rawBody,
      Object.fromEntries(request.headers),
      muxWebhookSecret(),
    );
  } catch (err) {
    console.error("[mux.webhook] signature failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "video.upload.asset_created": {
        // data tiene: id (upload_id), asset_id, new_asset_settings.passthrough
        const data = event.data as {
          id?: string;
          asset_id?: string;
          new_asset_settings?: { passthrough?: string };
        };
        const uploadId = data.id;
        const assetId = data.asset_id;
        const passthrough = data.new_asset_settings?.passthrough;
        if (!assetId || !uploadId) {
          console.warn("[mux.webhook] upload.asset_created sin asset_id/upload_id");
          return NextResponse.json({ received: true });
        }

        const section =
          (passthrough && (await findSection(admin, "id", passthrough))) ||
          (await findSection(admin, "mux_upload_id", uploadId));
        if (!section) {
          console.warn(
            `[mux.webhook] no se encontró sección para upload ${uploadId}`,
          );
          return NextResponse.json({ received: true });
        }

        const { error } = await admin
          .from("module_sections")
          .update({ mux_asset_id: assetId })
          .eq("id", section.id);
        if (error) {
          console.error("[mux.webhook] update asset_id failed:", error);
          return NextResponse.json(
            { error: "Update failed" },
            { status: 500 },
          );
        }
        return NextResponse.json({ received: true, sectionId: section.id });
      }

      case "video.asset.ready": {
        const data = event.data as {
          id?: string;
          passthrough?: string;
          duration?: number;
          playback_ids?: Array<{ id?: string; policy?: string }>;
        };
        const assetId = data.id;
        const passthrough = data.passthrough;
        // Preferimos signed (contenido pagado). Caemos a public sólo si el
        // asset fue creado con policy pública antes del backfill — el
        // backfill final convertirá esos a signed.
        const playback =
          data.playback_ids?.find((p) => p.policy === "signed")?.id ??
          data.playback_ids?.find((p) => p.policy === "public")?.id;
        const durationSec = data.duration
          ? Math.round(data.duration)
          : null;
        if (!assetId || !playback) {
          console.warn("[mux.webhook] asset.ready sin asset_id/playback_id");
          return NextResponse.json({ received: true });
        }

        const section =
          (passthrough && (await findSection(admin, "id", passthrough))) ||
          (await findSection(admin, "mux_asset_id", assetId));
        if (!section) {
          console.warn(
            `[mux.webhook] no se encontró sección para asset ${assetId}`,
          );
          return NextResponse.json({ received: true });
        }

        // Si la sección ya tenía un asset distinto, es un re-upload —
        // borramos el viejo en Mux para evitar cost leak por huérfanos.
        await deleteMuxAssetIfOrphan(section.mux_asset_id, assetId);

        const { error } = await admin
          .from("module_sections")
          .update({
            mux_asset_id: assetId,
            mux_playback_id: playback,
            duration_seconds: durationSec,
            mux_upload_id: null,
          })
          .eq("id", section.id);
        if (error) {
          console.error("[mux.webhook] update asset.ready failed:", error);
          return NextResponse.json(
            { error: "Update failed" },
            { status: 500 },
          );
        }

        // Invalida páginas admin y student para reflejar el video inmediatamente.
        revalidatePath("/admin/fases", "layout");
        revalidatePath("/fases", "layout");

        // Solicita a Mux que genere captions automáticos en español. Cuando
        // Mux termine, dispara `video.asset.track.ready` y ahí llamamos a
        // Polyglot AI para traducir a inglés / portugués. Best-effort: si la
        // request falla, los captions se pueden re-encolar manualmente.
        try {
          // text_source: "generated_vod" pide a Mux que genere los captions
          // automáticamente. La typings del SDK no lo expone aún (REST API sí).
          await muxClient().video.assets.createTrack(assetId, {
            type: "text",
            text_type: "subtitles",
            language_code: "es",
            name: "Español (auto)",
            closed_captions: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...({ text_source: "generated_vod" } as any),
          });
        } catch (e) {
          console.error(
            `[mux.webhook] failed to request ES auto-captions for ${assetId}:`,
            e,
          );
        }
        return NextResponse.json({ received: true, sectionId: section.id });
      }

      case "video.asset.track.ready": {
        // Mux acaba de terminar de generar una pista de texto. Solo nos
        // interesan las auto-generadas en español → las traducimos.
        const data = event.data as {
          id?: string; // track_id
          asset_id?: string;
          text_source?: string;
          language_code?: string;
        };
        const trackId = data.id;
        const assetId = data.asset_id;
        if (
          !trackId ||
          !assetId ||
          data.text_source !== "generated_vod" ||
          data.language_code !== "es"
        ) {
          return NextResponse.json({ received: true, ignored: "track filter" });
        }

        const section = await findSection(admin, "mux_asset_id", assetId);
        if (!section) {
          console.warn(`[mux.webhook] track.ready sin sección para asset ${assetId}`);
          return NextResponse.json({ received: true });
        }

        // Descargamos el VTT server-side. Para signed playback, firmamos un
        // token corto con el SDK de Mux (type:"video" cubre text tracks).
        let vttText: string;
        try {
          const { data: full } = await admin
            .from("module_sections")
            .select("mux_playback_id")
            .eq("id", section.id)
            .maybeSingle();
          if (!full?.mux_playback_id) throw new Error("no mux_playback_id");

          const raw = (await muxClient().jwt.signPlaybackId(full.mux_playback_id, {
            expiration: "600s",
            type: "video",
          })) as unknown as Record<string, string>;
          const token = raw["playback-token"] ?? raw.video;
          if (!token) throw new Error("no playback token returned");
          const vttUrl = `https://stream.mux.com/${full.mux_playback_id}/text/${trackId}.vtt?token=${token}`;
          const r = await fetch(vttUrl);
          if (!r.ok) throw new Error(`fetch VTT ${r.status}`);
          vttText = await r.text();
        } catch (e) {
          console.error(`[mux.webhook] failed to download ES VTT:`, e);
          return NextResponse.json({ received: true, error: (e as Error).message });
        }

        // Llamamos a Polyglot AI para traducir.
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL;
          const { enqueueTranslation } = await import("@/lib/polyglot/client");
          const targetLangs = (process.env.DAP_TARGET_LANGUAGES ?? "en,pt")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          const webhookSecret = process.env.POLYGLOT_WEBHOOK_SECRET;
          if (!webhookSecret) throw new Error("POLYGLOT_WEBHOOK_SECRET missing");
          const { jobId } = await enqueueTranslation({
            sourceCaptionsVtt: vttText,
            sourceLanguage: "es",
            targetLanguages: targetLangs,
            domainHint: "Christian theological class for pastors",
            externalRef: section.id,
            webhookUrl: `${appUrl}/api/captions-ready?secret=${encodeURIComponent(webhookSecret)}`,
          });
          console.log(`[mux.webhook] polyglot job ${jobId} enqueued for section ${section.id}`);
        } catch (e) {
          console.error(`[mux.webhook] polyglot enqueue failed:`, e);
        }

        return NextResponse.json({ received: true, sectionId: section.id });
      }

      case "video.asset.errored": {
        // Mux falló procesando el upload (codec inválido, archivo corrupto,
        // etc.). Sin este handler la sección quedaba en "Procesando…" para
        // siempre. Limpiamos asset_id/upload_id para que el admin pueda
        // re-intentar el upload desde cero.
        const data = event.data as {
          id?: string;
          passthrough?: string;
          errors?: { messages?: string[]; type?: string };
        };
        const assetId = data.id;
        const passthrough = data.passthrough;
        const errMessages = data.errors?.messages?.join("; ") ?? "unknown";

        const section =
          (passthrough && (await findSection(admin, "id", passthrough))) ||
          (assetId && (await findSection(admin, "mux_asset_id", assetId)));
        if (!section) {
          console.error(
            `[mux.webhook] asset.errored sin sección encontrada (assetId=${assetId}, passthrough=${passthrough}): ${errMessages}`,
          );
          return NextResponse.json({ received: true });
        }

        console.error(
          `[mux.webhook] asset.errored sección=${section.id} asset=${assetId}: ${errMessages}`,
        );
        const { error } = await admin
          .from("module_sections")
          .update({
            mux_asset_id: null,
            mux_playback_id: null,
            mux_upload_id: null,
            duration_seconds: null,
          })
          .eq("id", section.id);
        if (error) {
          console.error("[mux.webhook] update asset.errored failed:", error);
          return NextResponse.json(
            { error: "Update failed" },
            { status: 500 },
          );
        }
        revalidatePath("/admin/fases", "layout");
        return NextResponse.json({
          received: true,
          sectionId: section.id,
          status: "errored",
        });
      }

      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    console.error("[mux.webhook] handler error:", err);
    return NextResponse.json(
      { error: "Handler error" },
      { status: 500 },
    );
  }
}
