import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
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
  title_en: string | null;
  brand_name: string | null;
  brand_name_en: string | null;
  promise: string | null;
  promise_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  cover_image_url: string | null;
  dimension: {
    name: string;
    name_en: string | null;
    order_index: number;
  } | null;
  modules: { count: number }[] | null;
};

export async function PhasesGridV2() {
  const t = await getTranslations("Landing");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .select(
      "order_index, slug, title, title_en, brand_name, brand_name_en, promise, promise_en, subtitle, subtitle_en, cover_image_url, dimension:dimensions(name, name_en, order_index), modules(count)",
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
                title: localized(p, "title", locale) ?? p.title,
                subtitle: localized(p, "subtitle", locale),
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
        alt={t("phases.bgAlt")}
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
              {t("phases.eyebrow")}
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("phases.titleLead")} <span className="gradient-text">{t("phases.titleHighlight")}</span>.
            </h2>
          </div>
          <p className="max-w-md text-justify font-inter text-sm leading-relaxed text-text-secondary">
            {t("phases.intro")}
          </p>
        </div>

        {/* Netflix-style rail con scroll horizontal */}
        <PhasesNetflixRow
          phases={phases.map<NetflixPhaseRow>((p) => ({
            slug: p.slug,
            order_index: p.order_index,
            title: localized(p, "title", locale) ?? p.title,
            brand_name: localized(p, "brand_name", locale),
            promise: localized(p, "promise", locale),
            subtitle: localized(p, "subtitle", locale),
            cover_image_url: p.cover_image_url,
            dimension_name: p.dimension
              ? localized(p.dimension, "name", locale)
              : null,
            dimension_order: p.dimension?.order_index ?? null,
            modules_count: p.modules?.[0]?.count ?? 0,
          }))}
        />

        <p className="mt-6 text-center font-inter text-xs text-text-tertiary md:text-left">
          {t("phases.hoverHint")}
        </p>
      </div>
    </section>
  );
}

