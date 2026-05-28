import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { createClient as createSupabasePlainClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
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
  courseSchema,
  jsonLd,
  breadcrumbListSchema,
  SITE_URL,
} from "@/lib/seo/structured-data";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
import {
  DapRankBadge,
  type RankOrder,
} from "@/components/ui-dap/rank-badge";
import { Reveal } from "@/components/landing/reveal";

type PageProps = { params: Promise<{ slug: string }> };

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

// Mismo mapping que el hub /rangos para mantener consistencia visual.
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

type PhaseRow = {
  id: string;
  slug: string;
  order_index: number;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  description: string | null;
  description_en: string | null;
  months_duration: number;
  modules: { count: number }[] | null;
};

async function findRankBySlug(slug: string): Promise<DimensionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dimensions")
    .select("order_index, name, name_en, description, description_en")
    .returns<DimensionRow[]>();
  return (data ?? []).find((r) => rankSlug(r.name) === slug) ?? null;
}

export async function generateStaticParams() {
  const supabase = createSupabasePlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await supabase
    .from("dimensions")
    .select("name")
    .order("order_index", { ascending: true });
  return (data ?? []).map((d) => ({ slug: rankSlug(d.name) }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("PublicPages");
  const rank = await findRankBySlug(slug);
  if (!rank) {
    return {
      title: t("rankDetail.notFoundTitle"),
      robots: { index: false, follow: true },
    };
  }
  const theme = rankThemeFromDescription(rank.description);
  const description = theme
    ? t("rankDetail.metaDescriptionWithTheme", {
        name: rank.name,
        order: rank.order_index,
        theme,
      })
    : t("rankDetail.metaDescription", { name: rank.name });
  const url = `/rangos/${slug}`;
  const ogTitle = t("rankDetail.ogTitle", { name: rank.name });
  return {
    title: t("rankDetail.metaTitle", { name: rank.name }),
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article" as const,
      url,
      title: ogTitle,
      description,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: ogTitle,
      description,
    },
  };
}

export default async function RankDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("PublicPages");

  const supabase = await createClient();

  const { data: allRanks } = await supabase
    .from("dimensions")
    .select("order_index, name, name_en, description, description_en")
    .order("order_index", { ascending: true })
    .returns<DimensionRow[]>();

  const ranks = allRanks ?? [];
  const rank = ranks.find((r) => rankSlug(r.name) === slug);
  if (!rank) notFound();

  const order = rank.order_index as RankOrder;
  const Icon = ICON_BY_RANK[order];

  // Bloque correspondiente a este rango (por order_index 1:1).
  const { data: phaseData } = await supabase
    .from("phases")
    .select(
      "id, slug, order_index, title, title_en, subtitle, subtitle_en, description, description_en, months_duration, modules(count)",
    )
    .eq("order_index", rank.order_index)
    .eq("published", true)
    .maybeSingle<PhaseRow>();

  const here = ranks.findIndex((r) => r.order_index === rank.order_index);
  const prev = here > 0 ? ranks[here - 1] : null;
  const next =
    here >= 0 && here < ranks.length - 1 ? ranks[here + 1] : null;

  // Header user
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

  const locale = (await getLocale()) as Locale;
  const rankName = localized(rank, "name", locale) ?? rank.name;
  const rankDescription =
    localized(rank, "description", locale) ?? rank.description;
  const theme = rankThemeFromDescription(rankDescription);
  const phaseTitle = phaseData
    ? localized(phaseData, "title", locale) ?? phaseData.title
    : null;
  const phaseSubtitle = phaseData
    ? localized(phaseData, "subtitle", locale)
    : null;
  const phaseDescription = phaseData
    ? localized(phaseData, "description", locale)
    : null;
  const prevName = prev ? localized(prev, "name", locale) ?? prev.name : null;
  const nextName = next ? localized(next, "name", locale) ?? next.name : null;
  const modulesCount = phaseData?.modules?.[0]?.count ?? 0;

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      {/* JSON-LD Course (mismo schema que /fases pero asociado al rango) */}
      {phaseData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              courseSchema({
                slug: phaseData.slug,
                order_index: phaseData.order_index,
                title: t("rankDetail.courseTitle", {
                  name: rank.name,
                  phaseTitle: phaseData.title,
                }),
                subtitle: phaseData.subtitle,
                description: phaseData.description,
                months_duration: phaseData.months_duration,
              }),
            ),
          }}
        />
      )}
      {/* JSON-LD BreadcrumbList: Inicio → Dimensiones → este rango. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbListSchema([
              { name: t("rankDetail.breadcrumbHome"), url: SITE_URL },
              {
                name: t("rankDetail.breadcrumbRanks"),
                url: `${SITE_URL}/rangos`,
              },
              {
                name: rank.name,
                url: `${SITE_URL}/rangos/${rankSlug(rank.name)}`,
              },
            ]),
          ),
        }}
      />

      <DapPublicHeader user={headerUser} onSignOut={signOutAction} />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-24 sm:py-32">
          {/* Cover de la dimensión como background del hero */}
          <Image
            src={IMAGE_BY_RANK[order]}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-40 object-cover opacity-45"
          />
          <div className="absolute inset-0 -z-30 bg-gradient-to-b from-surface-base/80 via-surface-base/55 to-surface-base" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.32),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.24),transparent_60%)]" />

          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Link
              href="/rangos"
              className="mb-8 inline-flex items-center gap-2 font-inter text-sm text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="size-3.5" />
              {t("rankDetail.backToRanks")}
            </Link>

            <DapRankBadge
              rankOrder={order}
              size="xl"
              icon={Icon}
              label={rankName}
            />

            <p className="mt-8 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("rankDetail.eyebrow", {
                order: String(order).padStart(2, "0"),
              })}
            </p>
            <h1 className="mt-2 font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              {rankName}
            </h1>
            {theme && (
              <p className="mt-6 max-w-2xl font-inter text-base leading-relaxed text-text-secondary md:text-lg">
                {t("rankDetail.awardedPre")}
                <strong className="text-text-primary">
                  {t("rankDetail.awardedStrong", { order, theme })}
                </strong>
                {t("rankDetail.awardedPost")}
              </p>
            )}
          </div>
        </section>

        {/* Bloque info */}
        {phaseData && (
          <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
            <div className="mx-auto max-w-4xl">
              <Reveal>
                <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                  {t("rankDetail.blockEyebrow")}
                </p>
                <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
                  {phaseTitle}
                </h2>
                {phaseSubtitle && (
                  <p className="mt-4 font-inter text-base text-text-secondary md:text-lg">
                    {phaseSubtitle}
                  </p>
                )}
                {phaseDescription && (
                  <p className="mt-6 text-justify font-inter text-base leading-relaxed text-text-secondary">
                    {phaseDescription}
                  </p>
                )}

                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/[0.06] bg-surface-elevated p-5">
                    <BookOpen className="mb-3 size-5 text-brand-violet" />
                    <p className="font-grotesk text-h3 font-bold text-text-primary">
                      {modulesCount}
                    </p>
                    <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                      {t("rankDetail.statModules")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-surface-elevated p-5">
                    <ShieldCheck className="mb-3 size-5 text-brand-coral" />
                    <p className="font-grotesk text-h3 font-bold text-text-primary">
                      {t("rankDetail.statMonths", {
                        count: phaseData.months_duration,
                      })}
                    </p>
                    <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                      {t("rankDetail.statDuration")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-surface-elevated p-5">
                    <Icon className="mb-3 size-5 text-brand-amber" />
                    <p className="font-grotesk text-h3 font-bold text-text-primary">
                      {rankName}
                    </p>
                    <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                      {t("rankDetail.statDimensionAtCompletion")}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <DapButton
                    render={<Link href={`/fases/${phaseData.slug}`} />}
                  >
                    {t("rankDetail.viewFullBlock")}
                    <ArrowRight />
                  </DapButton>
                  <EnrollmentCTA href="/suscribirme" variant="secondary">
                    {t("rankDetail.startJourney")}
                  </EnrollmentCTA>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* Prev / next nav */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-12">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/rangos/${rankSlug(prev.name)}`}
                className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface-elevated p-5 transition-colors hover:border-brand-violet/30"
              >
                <ArrowLeft className="size-4 text-text-tertiary transition-colors group-hover:text-brand-coral" />
                <div>
                  <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                    {t("rankDetail.prevLabel")}
                  </p>
                  <p className="font-grotesk text-base font-semibold text-text-primary">
                    {prevName}
                  </p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/rangos/${rankSlug(next.name)}`}
                className="group flex items-center justify-end gap-3 rounded-xl border border-white/[0.06] bg-surface-elevated p-5 text-right transition-colors hover:border-brand-violet/30 sm:text-right"
              >
                <div>
                  <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                    {t("rankDetail.nextLabel")}
                  </p>
                  <p className="font-grotesk text-base font-semibold text-text-primary">
                    {nextName}
                  </p>
                </div>
                <ArrowRight className="size-4 text-text-tertiary transition-colors group-hover:text-brand-coral" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
