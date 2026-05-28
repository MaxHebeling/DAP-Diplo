import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import {
  Briefcase,
  Building2,
  Coins,
  Flame,
  GraduationCap,
  Heart,
  type LucideIcon,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { getTranslations, getLocale } from "next-intl/server";

import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { rankSlug, rankThemeFromDescription } from "@/lib/ranks/slug";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
import {
  DapRankBadge,
  type RankOrder,
} from "@/components/ui-dap/rank-badge";
import { Reveal } from "@/components/landing/reveal";
import {
  jsonLd,
  ranksItemListSchema,
  breadcrumbListSchema,
  SITE_URL,
} from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("ranks.metaTitle"),
    description: t("ranks.metaDescription"),
    alternates: { canonical: "/rangos" },
    openGraph: {
      type: "website",
      url: "/rangos",
      title: t("ranks.ogTitle"),
      description: t("ranks.ogDescription"),
    },
  };
}

const ICON_BY_RANK: Record<RankOrder, LucideIcon> = {
  1: GraduationCap,
  2: Heart,
  3: Users,
  4: ShieldCheck,
  5: Briefcase,
  6: Coins,
  7: Flame,
  8: Building2,
  9: Send,
};

// Cover image por dimensión (matched by order_index). Si después se
// edita el mapping desde admin/bloques, mover esto a la DB.
const IMAGE_BY_RANK: Record<RankOrder, string> = {
  1: "/dimensions/01-discipulo.jpg",
  2: "/dimensions/02-hijo.jpg",
  3: "/dimensions/03-lider.jpg",
  4: "/dimensions/04-pastor.jpg",
  5: "/dimensions/05-administrador.jpg",
  6: "/dimensions/06-mayordomo.jpg",
  7: "/dimensions/07-reformador.jpg",
  8: "/dimensions/08-arquitecto.jpg",
  9: "/dimensions/09-enviado.jpg",
};

type DimensionRow = {
  order_index: number;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
};

export default async function RangosHubPage() {
  const t = await getTranslations("PublicPages");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: DapHeaderUser = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      headerUser = {
        fullName: profile.full_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
        role: profile.role as "student" | "admin",
      };
    }
  }

  const { data: dimensions, error } = await supabase
    .from("dimensions")
    .select("order_index, name, name_en, description, description_en")
    .order("order_index", { ascending: true })
    .returns<DimensionRow[]>();

  if (error) {
    throw new Error(t("ranks.loadError", { message: error.message }));
  }

  const ranks = dimensions ?? [];

  const itemListLd = ranksItemListSchema(
    ranks.map((r) => ({
      order_index: r.order_index,
      name: localized(r, "name", locale) ?? r.name,
      slug: rankSlug(r.name),
    })),
  );
  const breadcrumbsLd = breadcrumbListSchema([
    { name: t("ranks.breadcrumbHome"), url: SITE_URL },
    { name: t("ranks.breadcrumbRanks"), url: `${SITE_URL}/rangos` },
  ]);

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      {/* JSON-LD: ItemList de las 9 dimensiones + breadcrumb. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbsLd) }}
      />

      <DapPublicHeader user={headerUser} onSignOut={signOutAction} />

      <main className="flex flex-1 flex-col">
        {/* Hero de la página */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-28 sm:py-32">
          {/* Ciudad futurista del Reino — backdrop del hero */}
          <Image
            src="/rangos-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-40 object-cover opacity-55"
          />
          <div className="absolute inset-0 -z-30 bg-gradient-to-b from-surface-base/75 via-surface-base/55 to-surface-base" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.3),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.22),transparent_60%)]" />

          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("ranks.heroEyebrow")}
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              {t("ranks.heroTitlePre")}
              <span className="gradient-text">{t("ranks.heroTitleAccent")}</span>
              {t("ranks.heroTitlePost")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base leading-relaxed text-text-secondary md:text-lg">
              {t("ranks.heroBody")}
            </p>
          </div>
        </section>

        {/* Grid de 9 dimensiones */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ranks.map((r, i) => {
                const order = (r.order_index as RankOrder) ?? 1;
                const Icon = ICON_BY_RANK[order];
                const cover = IMAGE_BY_RANK[order];
                const slug = rankSlug(r.name);
                const rankName = localized(r, "name", locale) ?? r.name;
                const theme = rankThemeFromDescription(
                  localized(r, "description", locale),
                );
                return (
                  <Reveal key={r.order_index} delay={i * 0.04}>
                    <Link
                      href={`/rangos/${slug}`}
                      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-surface-elevated transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet"
                    >
                      {/* Cover image */}
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={cover}
                          alt={t("ranks.cardImageAlt", { name: rankName })}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated via-surface-elevated/30 to-transparent" />
                        <span className="absolute right-4 top-4 gradient-text font-grotesk text-h3 font-bold leading-none drop-shadow-lg">
                          {String(order).padStart(2, "0")}
                        </span>
                        <div className="absolute bottom-4 left-4">
                          <DapRankBadge
                            rankOrder={order}
                            size="md"
                            icon={Icon}
                            label={rankName}
                          />
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-6">
                        <h2 className="mb-2 font-grotesk text-h3 font-semibold text-text-primary">
                          {rankName}
                        </h2>
                        {theme && (
                          <p className="font-inter text-sm leading-relaxed text-text-secondary">
                            {theme}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-4 font-inter text-xs">
                          <span className="font-medium uppercase tracking-wider text-brand-coral">
                            {t("ranks.cardBlock", {
                              number: String(order).padStart(2, "0"),
                            })}
                          </span>
                          <ArrowRight className="size-4 text-text-tertiary transition-colors group-hover:text-brand-coral" />
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative isolate overflow-hidden border-y border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("ranks.ctaTitlePre")}
              <span className="gradient-text">{t("ranks.ctaTitleAccent")}</span>
              {t("ranks.ctaTitlePost")}
            </h2>
            <p className="mt-6 font-inter text-base text-text-secondary md:text-lg">
              {t("ranks.ctaBody")}
            </p>
            <div className="mt-10">
              <EnrollmentCTA href="/suscribirme" size="lg">
                {t("ranks.ctaButton")}
                <ArrowRight />
              </EnrollmentCTA>
            </div>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
