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
};

async function findSection(
  admin: ReturnType<typeof createAdminClient>,
  column: "id" | "mux_upload_id" | "mux_asset_id",
  value: string,
): Promise<SectionLookup | null> {
  const { data } = await admin
    .from("module_sections")
    .select("id, module_id")
    .eq(column, value)
    .maybeSingle();
  return data ?? null;
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
    const msg = err instanceof Error ? err.message : "Firma inválida";
    console.error("[mux.webhook] signature failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
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
          console.error("[mux.webhook] update asset_id failed:", error.message);
          return NextResponse.json({ error: error.message }, { status: 500 });
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
        const playback = data.playback_ids?.find(
          (p) => p.policy === "public",
        )?.id;
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
          console.error("[mux.webhook] update asset.ready failed:", error.message);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Invalida páginas admin y student para reflejar el video inmediatamente.
        revalidatePath("/admin/bloques", "layout");
        revalidatePath("/bloques", "layout");
        return NextResponse.json({ received: true, sectionId: section.id });
      }

      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mux.webhook] handler error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
