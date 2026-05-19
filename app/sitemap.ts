import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { rankSlug } from "@/lib/ranks/slug";

const BASE_URL = "https://www.dapglobal.org";

type PhaseRow = {
  slug: string;
  updated_at: string | null;
};

type DimensionRow = {
  name: string;
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
      url: `${BASE_URL}/como-funciona`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/precios`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/rangos`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/suscribirme`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // Legal — baja prioridad pero indexables (search trust).
    {
      url: `${BASE_URL}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/reembolso`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  let phaseEntries: MetadataRoute.Sitemap = [];
  let rankEntries: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();

    // Fases publicadas
    const { data: phasesData } = await supabase
      .from("phases")
      .select("slug, updated_at")
      .eq("published", true)
      .returns<PhaseRow[]>();

    phaseEntries = (phasesData ?? []).map((p) => ({
      url: `${BASE_URL}/fases/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    }));

    // 9 rangos
    const { data: dimsData } = await supabase
      .from("dimensions")
      .select("name")
      .returns<DimensionRow[]>();

    rankEntries = (dimsData ?? []).map((d) => ({
      url: `${BASE_URL}/rangos/${rankSlug(d.name)}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    }));
  } catch {
    // Sin Supabase disponible — sale solo con estáticas.
  }

  return [...staticEntries, ...phaseEntries, ...rankEntries];
}
