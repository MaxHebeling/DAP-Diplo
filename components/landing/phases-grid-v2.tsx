import Image from "next/image";

import { createClient } from "@/lib/supabase/server";
import {
  coursesItemListSchema,
  jsonLd,
} from "@/lib/seo/structured-data";
import {
  PhasesNetflixRow,
  type NetflixPhaseRow,
} from "./phases-netflix-row";

type PhaseRow = {
  order_index: number;
  slug: string;
  title: string;
  brand_name: string | null;
  promise: string | null;
  subtitle: string | null;
  cover_image_url: string | null;
  dimension: { name: string; order_index: number } | null;
  modules: { count: number }[] | null;
};

export async function PhasesGridV2() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .select(
      "order_index, slug, title, brand_name, promise, subtitle, cover_image_url, dimension:dimensions(name, order_index), modules(count)",
    )
    .eq("published", true)
    .order("order_index", { ascending: true })
    .returns<PhaseRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las fases: ${error.message}`);
  }

  const phases = data ?? [];

  return (
    <section
      id="bloques"
      className="relative isolate overflow-hidden border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36"
    >
      {/* JSON-LD ItemList con los 9 bloques (rich result oportunidad) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            coursesItemListSchema(
              phases.map((p) => ({
                slug: p.slug,
                order_index: p.order_index,
                title: p.title,
                subtitle: p.subtitle,
                description: null,
                months_duration: null,
              })),
            ),
          ),
        }}
      />

      {/* Background photo + tints (capas back→front) */}
      <Image
        src="/phases-bg.jpg"
        alt="Pastores y líderes en una conferencia apostólica del DAP"
        fill
        sizes="100vw"
        className="-z-40 object-cover opacity-15"
      />
      <div className="absolute inset-0 -z-35 bg-gradient-to-b from-surface-base/70 via-transparent to-surface-base/85" />
      <div className="absolute inset-0 -z-30 bg-brand-coral/10 mix-blend-multiply" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              Los 9 bloques
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              Nueve dimensiones de la <span className="gradient-text">unción apostólica</span>
            </h2>
          </div>
          <p className="max-w-md text-justify font-inter text-sm leading-relaxed text-text-secondary">
            8 módulos por bloque, 1 módulo por semana. Cada bloque entrega una
            dimensión nueva y prepara para el siguiente. Al final, las 9
            forman al líder enviado.
          </p>
        </div>

        {/* Netflix-style rail con scroll horizontal */}
        <PhasesNetflixRow
          phases={phases.map<NetflixPhaseRow>((p) => ({
            slug: p.slug,
            order_index: p.order_index,
            title: p.title,
            brand_name: p.brand_name,
            promise: p.promise,
            subtitle: p.subtitle,
            cover_image_url: p.cover_image_url,
            dimension_name: p.dimension?.name ?? null,
            dimension_order: p.dimension?.order_index ?? null,
            modules_count: p.modules?.[0]?.count ?? 0,
          }))}
        />

        <p className="mt-6 text-center font-inter text-xs text-text-tertiary md:text-left">
          Desliza horizontalmente o usa las flechas para ver los 9 bloques.
        </p>
      </div>
    </section>
  );
}

