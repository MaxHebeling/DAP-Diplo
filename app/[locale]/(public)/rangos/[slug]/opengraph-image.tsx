import { ImageResponse } from "next/og";
import { createClient as createSupabasePlainClient } from "@supabase/supabase-js";

import {
  CosmicLayout,
  OG_CONTENT_TYPE,
  OG_SIZE,
  loadLogoDataUrl,
} from "@/lib/og/cosmic-bg";
import { rankSlug } from "@/lib/ranks/slug";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Dimensión del DAP — Diplomado Apostólico Pastoral";

type PageProps = { params: Promise<{ slug: string }> };

type RankRow = {
  order_index: number;
  name: string;
  description: string | null;
};

export default async function Image({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createSupabasePlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Las dimensiones se identifican por nombre (no por slug); buscamos
  // matching del slug normalizado contra rankSlug(name).
  const { data: allRanks } = await supabase
    .from("dimensions")
    .select("order_index, name, description")
    .returns<RankRow[]>();

  const rank = (allRanks ?? []).find((r) => rankSlug(r.name) === slug);

  const logoSrc = await loadLogoDataUrl();

  const rankN = rank ? String(rank.order_index).padStart(2, "0") : "??";
  const title = rank?.name ?? "Dimensión del DAP";
  // El description suele ser largo (varios párrafos); cortamos a la
  // primera oración para que entre en el OG.
  const subtitle = rank?.description?.split(/\.\s/)[0]
    ? `${rank.description.split(/\.\s/)[0]}.`
    : undefined;

  return new ImageResponse(
    (
      <CosmicLayout
        logoSrc={logoSrc}
        eyebrow={`Dimensión ${rankN} · Las 9 del Reino`}
        title={title}
        subtitle={subtitle}
      />
    ),
    { ...size },
  );
}
