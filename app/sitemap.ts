import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";
import { rankSlug } from "@/lib/ranks/slug";

const BASE_URL = "https://www.dapglobal.org";

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

type PhaseRow = {
  slug: string;
  updated_at: string | null;
};

type DimensionRow = {
  name: string;
};

/**
 * Construye una entrada de sitemap con alternates hreflang es/en.
 * `path` es la ruta base en español sin prefijo (ej. "/precios"); "/" para
 * la home. El español es la URL canónica (sin prefijo, localePrefix
 * "as-needed"); el inglés vive bajo /en.
 */
function entry(
  path: string,
  changeFrequency: ChangeFreq,
  priority: number,
  lastModified: Date,
): MetadataRoute.Sitemap[number] {
  const clean = path === "/" ? "" : path;
  const esUrl = `${BASE_URL}${clean || "/"}`;
  return {
    url: esUrl,
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        es: esUrl,
        en: `${BASE_URL}/en${clean}`,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    entry("/", "weekly", 1.0, now),
    entry("/como-funciona", "monthly", 0.9, now),
    entry("/precios", "monthly", 0.9, now),
    entry("/rangos", "monthly", 0.8, now),
    entry("/contacto", "monthly", 0.6, now),
    entry("/suscribirme", "monthly", 0.9, now),
    // Legal — baja prioridad pero indexables (search trust).
    entry("/terminos", "yearly", 0.3, now),
    entry("/privacidad", "yearly", 0.3, now),
    entry("/reembolso", "yearly", 0.3, now),
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

    phaseEntries = (phasesData ?? []).map((p) =>
      entry(
        `/fases/${p.slug}`,
        "monthly",
        0.85,
        p.updated_at ? new Date(p.updated_at) : now,
      ),
    );

    // 9 rangos
    const { data: dimsData } = await supabase
      .from("dimensions")
      .select("name")
      .returns<DimensionRow[]>();

    rankEntries = (dimsData ?? []).map((d) =>
      entry(`/rangos/${rankSlug(d.name)}`, "monthly", 0.75, now),
    );
  } catch {
    // Sin Supabase disponible — sale solo con estáticas.
  }

  return [...staticEntries, ...phaseEntries, ...rankEntries];
}
