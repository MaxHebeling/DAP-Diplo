import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://www.dapglobal.org";

type PhaseRow = {
  slug: string;
  updated_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/suscribirme`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  // Fases publicadas (las páginas /fases/[slug] del landing público)
  let phaseEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("phases")
      .select("slug, updated_at")
      .eq("published", true)
      .returns<PhaseRow[]>();

    phaseEntries = (data ?? []).map((p) => ({
      url: `${BASE_URL}/fases/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    }));
  } catch {
    // Sin Supabase disponible (build time sin env) — sitemap sale solo con
    // entries estáticas. Vercel build sí tiene env, así que pobla normalmente.
  }

  return [...staticEntries, ...phaseEntries];
}
