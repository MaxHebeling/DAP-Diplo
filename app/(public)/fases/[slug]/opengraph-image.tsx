import { ImageResponse } from "next/og";
import { createClient as createSupabasePlainClient } from "@supabase/supabase-js";

import {
  CosmicLayout,
  OG_CONTENT_TYPE,
  OG_SIZE,
  loadLogoDataUrl,
} from "@/lib/og/cosmic-bg";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Bloque del DAP — Diplomado Apostólico Pastoral";

type PageProps = { params: Promise<{ slug: string }> };

type PhaseRow = {
  order_index: number;
  title: string;
  brand_name: string | null;
  promise: string | null;
  subtitle: string | null;
  dimension: { name: string } | null;
};

export default async function Image({ params }: PageProps) {
  const { slug } = await params;

  // Cliente plano (sin cookies) porque OG image se renderea sin contexto HTTP.
  const supabase = createSupabasePlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: phase } = await supabase
    .from("phases")
    .select(
      "order_index, title, brand_name, promise, subtitle, dimension:dimensions(name)",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle<PhaseRow>();

  const logoSrc = await loadLogoDataUrl();

  const blockN = phase
    ? String(phase.order_index).padStart(2, "0")
    : "??";
  const title = phase?.brand_name ?? phase?.title ?? "Bloque del DAP";
  const dimensionName = phase?.dimension?.name;
  const subtitle = phase?.promise ?? phase?.subtitle ?? undefined;

  return new ImageResponse(
    (
      <CosmicLayout
        logoSrc={logoSrc}
        eyebrow={
          dimensionName
            ? `Bloque ${blockN} · Dimensión ${dimensionName}`
            : `Bloque ${blockN}`
        }
        title={title}
        subtitle={subtitle}
      />
    ),
    { ...size },
  );
}
