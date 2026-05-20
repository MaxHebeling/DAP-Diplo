import Image from "next/image";
import {
  BookOpen,
  Briefcase,
  Building2,
  Coins,
  Cpu,
  Crown,
  Globe2,
  Heart,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  coursesItemListSchema,
  jsonLd,
} from "@/lib/seo/structured-data";
import { PhaseCard } from "./phase-card";

type PhaseRow = {
  order_index: number;
  slug: string;
  title: string;
  brand_name: string | null;
  promise: string | null;
  subtitle: string | null;
  dimension: { name: string; order_index: number } | null;
  modules: { count: number }[] | null;
};

const ICON_BY_ORDER: Record<number, LucideIcon> = {
  1: BookOpen,
  2: Heart,
  3: Crown,
  4: Sparkles,
  5: ShieldCheck,
  6: Coins,
  7: Briefcase,
  8: Cpu,
  9: Globe2,
};

export async function PhasesGridV2() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .select(
      "order_index, slug, title, brand_name, promise, subtitle, dimension:dimensions(name, order_index), modules(count)",
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((p) => {
            const Icon = ICON_BY_ORDER[p.order_index] ?? BookOpen;
            const count = p.modules?.[0]?.count ?? 0;
            const dimensionN = String(
              p.dimension?.order_index ?? p.order_index,
            ).padStart(2, "0");
            const dimensionName = p.dimension?.name ?? "—";
            // Mostramos brand_name como hero del card; fallback al title académico
            const heroTitle = p.brand_name ?? p.title;
            return (
              <PhaseCard key={p.slug} href={`/fases/${p.slug}`}>
                <div className="mb-4 flex items-start justify-between">
                  <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-coral">
                    Dimensión {dimensionN} · {dimensionName}
                  </p>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet transition-colors group-hover:bg-brand-violet/20">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </div>
                </div>
                <h3 className="mb-1 gradient-text font-grotesk text-h3 font-bold leading-tight">
                  {heroTitle}
                </h3>
                {p.subtitle && (
                  <p className="mb-3 font-inter text-sm leading-relaxed text-text-secondary">
                    {p.subtitle}
                  </p>
                )}
                {p.promise && (
                  <p className="mt-1 font-inter text-sm italic leading-relaxed text-text-primary/85">
                    {p.promise}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-4 font-inter text-xs">
                  <span className="font-medium text-text-tertiary">
                    Bloque {String(p.order_index).padStart(2, "0")}
                  </span>
                  <span className="text-text-tertiary">{count} módulos</span>
                </div>
              </PhaseCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

