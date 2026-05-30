import { createClient as createSupabasePlainClient } from "@supabase/supabase-js";
import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EnrollmentCTAPhase } from "@/components/launch/enrollment-cta-phase";
import { Reveal } from "@/components/landing/reveal";
import { SiteHeader, type HeaderUser } from "@/components/landing/site-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import {
  courseSchema,
  jsonLd,
  breadcrumbListSchema,
  SITE_URL,
} from "@/lib/seo/structured-data";
import { formatDuration } from "@/lib/format";

type ModuleRow = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  subtitle_en: string | null;
  duration_minutes: number | null;
};

type RankRef = {
  name: string;
  name_en: string | null;
  order_index: number;
} | null;

type BlockDetail = {
  id: string;
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
  description: string | null;
  description_en: string | null;
  cover_image_url: string | null;
  months_duration: number;
  published: boolean;
  dimension: RankRef;
  modules: ModuleRow[] | null;
};

type NeighborBlock = {
  slug: string;
  order_index: number;
  title: string;
  title_en: string | null;
};

type PageProps = { params: Promise<{ slug: string }> };

// Pre-renderiza los 9 slugs publicados al build.
// (dynamicParams = true por default → admins pueden previsualizar
// fases no publicados via render on-demand.)
// Usa un cliente Supabase plano (sin cookies) porque generateStaticParams
// corre al build sin contexto HTTP — createClient de @/lib/supabase/server
// invocaría cookies() y rompería.
export async function generateStaticParams() {
  const supabase = createSupabasePlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await supabase
    .from("phases")
    .select("slug")
    .eq("published", true)
    .order("order_index", { ascending: true });
  return (data ?? []).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("PublicPages");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const { data } = await supabase
    .from("phases")
    .select(
      "title, title_en, brand_name, brand_name_en, promise, promise_en, subtitle, subtitle_en, description, description_en",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!data) {
    return {
      title: t("phases.notFoundTitle"),
      robots: { index: false, follow: true },
    };
  }
  const url = `/fases/${slug}`;
  const title = localized(data, "title", locale) ?? data.title;
  const heroTitle = localized(data, "brand_name", locale) ?? title;
  const description =
    localized(data, "promise", locale) ??
    localized(data, "subtitle", locale) ??
    localized(data, "description", locale) ??
    undefined;
  const ogTitle = t("phases.ogTitleSuffix", { title: heroTitle });
  return {
    title: heroTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: ogTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function BlockDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const t = await getTranslations("PublicPages");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();

  // Fase + dimensión + módulos en una sola query (sin filtrar published acá
  // para permitir admin bypass más abajo).
  const { data: phase, error } = await supabase
    .from("phases")
    .select(
      `id, order_index, slug, title, title_en, brand_name, brand_name_en,
       promise, promise_en, subtitle, subtitle_en, description, description_en,
       cover_image_url, months_duration, published,
       dimension:dimensions(name, name_en, order_index),
       modules(id, order_index, slug, title, title_en, subtitle, subtitle_en, duration_minutes)`,
    )
    .eq("slug", slug)
    .maybeSingle<BlockDetail>();

  if (error) {
    throw new Error(t("phases.loadError", { message: error.message }));
  }
  if (!phase) notFound();

  // Sesión del visitante (también pinta el header con su avatar/role).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: HeaderUser = null;
  let isAdmin = false;
  let hasActiveSub = false;
  const isLoggedIn = !!user;
  if (user) {
    const [{ data: profile }, { data: sub }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url, role")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ status: string; current_period_end: string | null }>(),
    ]);
    if (profile) {
      headerUser = {
        fullName: profile.full_name ?? null,
        avatarUrl: profile.avatar_url ?? null,
        role: profile.role as "student" | "admin",
      };
      isAdmin = profile.role === "admin";
    }
    hasActiveSub =
      !!sub &&
      (sub.status === "active" || sub.status === "trialing") &&
      (sub.current_period_end === null ||
        new Date(sub.current_period_end) > new Date());
  }

  // Gate: fase no publicado → 404 a no ser que sea admin.
  if (!phase.published && !isAdmin) {
    notFound();
  }

  // Supabase no ordena el embed por defecto.
  const modules = [...(phase.modules ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );

  // Vecinos prev/next entre los 9 fases publicados.
  const { data: allBlocks } = await supabase
    .from("phases")
    .select("slug, order_index, title, title_en")
    .eq("published", true)
    .order("order_index", { ascending: true })
    .returns<NeighborBlock[]>();

  const list = allBlocks ?? [];
  const here = list.findIndex((b) => b.order_index === phase.order_index);
  const prev: NeighborBlock | null = here > 0 ? list[here - 1] : null;
  const next: NeighborBlock | null =
    here >= 0 && here < list.length - 1 ? list[here + 1] : null;

  const totalMinutes = modules.reduce(
    (sum, m) => sum + (m.duration_minutes ?? 25),
    0,
  );

  // Valores localizados para el render (slug/URLs/order quedan en base).
  const phaseTitle = localized(phase, "title", locale) ?? phase.title;
  const phaseHeroTitle = localized(phase, "brand_name", locale) ?? phaseTitle;
  const phaseSubtitle = localized(phase, "subtitle", locale);
  const phasePromise = localized(phase, "promise", locale);
  const phaseDescription = localized(phase, "description", locale);
  const dimensionName = phase.dimension
    ? localized(phase.dimension, "name", locale)
    : null;

  return (
    <div className="flex flex-1 flex-col bg-neutral-950 text-neutral-50">
      {/* JSON-LD Course (rich result oportunidad) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            courseSchema({
              slug: phase.slug,
              order_index: phase.order_index,
              title: phaseTitle,
              subtitle: phaseSubtitle,
              description: phaseDescription,
              months_duration: phase.months_duration,
            }),
          ),
        }}
      />
      {/* JSON-LD BreadcrumbList: Inicio → Bloques → este bloque. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbListSchema([
              { name: t("phases.breadcrumbHome"), url: SITE_URL },
              {
                name: t("phases.breadcrumbHowItWorks"),
                url: `${SITE_URL}/como-funciona`,
              },
              {
                name: t("phases.breadcrumbBlock", {
                  number: String(phase.order_index).padStart(2, "0"),
                  title: phaseTitle,
                }),
                url: `${SITE_URL}/fases/${phase.slug}`,
              },
            ]),
          ),
        }}
      />
      <SiteHeader user={headerUser} />
      <main className="flex flex-1 flex-col">
        {/* HERO */}
        <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-36 sm:pb-24">
          {phase.cover_image_url ? (
            <Image
              src={phase.cover_image_url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-20 object-cover opacity-30"
            />
          ) : null}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-950 via-neutral-950/50 to-neutral-950" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-20 -z-10 h-96 bg-[radial-gradient(45%_55%_at_50%_30%,rgba(253,173,90,0.14),transparent)]"
          />

          <div className="mx-auto max-w-5xl px-6">
            <Reveal>
              <Link
                href="/#bloques"
                className="mb-10 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-brand-coral"
              >
                <ArrowLeft className="size-4" />
                {t("phases.backToBlocks")}
              </Link>

              {!phase.published && (
                <Badge className="mb-6 bg-amber-500/15 text-amber-300 hover:bg-amber-500/20">
                  {t("phases.previewBadge")}
                </Badge>
              )}

              {/* Eyebrow: Dimensión NN · Nombre */}
              <p className="mb-3 font-inter text-xs font-semibold uppercase tracking-[0.3em] text-brand-coral">
                {dimensionName
                  ? t("phases.eyebrowDimensionWithName", {
                      number: String(
                        phase.dimension?.order_index ?? phase.order_index,
                      ).padStart(2, "0"),
                      name: dimensionName,
                    })
                  : t("phases.eyebrowDimension", {
                      number: String(
                        phase.dimension?.order_index ?? phase.order_index,
                      ).padStart(2, "0"),
                    })}
              </p>

              {/* Brand name (título grande gradiente) o fallback al title académico */}
              <h1 className="mb-3 font-serif text-balance text-5xl font-semibold leading-[1.05] sm:text-6xl">
                <span className="gradient-text">{phaseHeroTitle}</span>
              </h1>

              {/* Subtítulo descriptivo */}
              {phaseSubtitle && (
                <p className="mb-6 max-w-3xl font-inter text-xl leading-snug text-neutral-300">
                  {phaseSubtitle}
                </p>
              )}

              {/* Línea de promesa */}
              {phasePromise && (
                <p className="mb-8 max-w-3xl font-inter text-lg italic leading-relaxed text-neutral-200">
                  {phasePromise}
                </p>
              )}

              {/* Descripción larga (si existe) */}
              {phaseDescription && (
                <p className="mb-10 max-w-3xl text-justify text-base leading-relaxed text-neutral-400 hyphens-auto">
                  {phaseDescription}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-400">
                <Badge
                  variant="secondary"
                  className="bg-white/5 text-neutral-200"
                >
                  {t("phases.blockBadge", {
                    number: String(phase.order_index).padStart(2, "0"),
                  })}
                </Badge>
                <span className="text-neutral-700">·</span>
                <Badge
                  variant="secondary"
                  className="bg-white/5 text-neutral-200"
                >
                  {modules.length}{" "}
                  {modules.length === 1
                    ? t("phases.moduleSingular")
                    : t("phases.modulePlural")}
                </Badge>
                <span className="text-neutral-700">·</span>
                <span>{t("phases.oneModulePerWeek")}</span>
                {totalMinutes > 0 && (
                  <>
                    <span className="text-neutral-700">·</span>
                    <span>
                      {t("phases.contentDuration", {
                        duration: formatDuration(totalMinutes * 60),
                      })}
                    </span>
                  </>
                )}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ¿QUÉ APRENDERÁS? */}
        <section className="border-t border-white/5 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
                {t("phases.whatYouLearnEyebrow")}
              </p>
              <h2 className="mb-10 font-serif text-balance text-3xl font-semibold leading-tight text-neutral-50 sm:text-4xl">
                {t("phases.whatYouLearnHeading")}
              </h2>
              <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 sm:p-10">
                <p className="text-justify text-sm leading-relaxed text-neutral-400 hyphens-auto">
                  {t("phases.whatYouLearnBody")}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* MÓDULOS DEL BLOQUE — lista no clickeable */}
        <section className="border-t border-white/5 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
                {t("phases.modulesEyebrow")}
              </p>
              <h2 className="mb-12 font-serif text-balance text-3xl font-semibold leading-tight text-neutral-50 sm:text-4xl">
                {modules.length === 1
                  ? t("phases.modulesHeadingSingular", { count: modules.length })
                  : t("phases.modulesHeadingPlural", { count: modules.length })}
              </h2>
            </Reveal>

            {modules.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-neutral-400">
                {t("phases.noModules")}
              </p>
            ) : (
              <ol className="grid gap-2 sm:grid-cols-2">
                {modules.map((m) => {
                  const moduleTitle = localized(m, "title", locale) ?? m.title;
                  const moduleSubtitle = localized(m, "subtitle", locale);
                  // Alumnos logueados con suscripción O admins pueden entrar
                  // directamente al módulo. Visitantes públicos solo ven la
                  // tarjeta como display (no clickable).
                  const canOpen = isLoggedIn && (hasActiveSub || isAdmin);
                  const inner = (
                    <>
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 font-serif text-sm font-medium text-neutral-300">
                        {String(m.order_index).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-50">
                          {moduleTitle}
                        </p>
                        {moduleSubtitle && (
                          <p className="truncate text-xs text-neutral-500">
                            {moduleSubtitle}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                        {t("phases.moduleMinutes", {
                          minutes: m.duration_minutes ?? 25,
                        })}
                      </span>
                    </>
                  );
                  if (canOpen) {
                    return (
                      <li key={m.id}>
                        <Link
                          href={`/fases/${phase.slug}/modulos/${m.slug}`}
                          className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900/30 px-5 py-4 transition-all hover:border-brand-coral/40 hover:bg-neutral-900/60"
                        >
                          {inner}
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900/30 px-5 py-4"
                    >
                      {inner}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* CTA grande coral */}
        <section className="bg-brand-coral px-6 py-24 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -z-10 h-96 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.16),transparent)]"
          />
          <div className="mx-auto max-w-3xl text-center text-brand-coral-foreground">
            <Reveal>
              <h2 className="mb-5 font-serif text-balance text-4xl font-semibold leading-tight sm:text-5xl">
                {t("phases.ctaHeading")}
              </h2>
              <p className="mb-10 text-balance text-base sm:text-lg">
                {t("phases.ctaBody")}
              </p>
              <EnrollmentCTAPhase
                href="/suscribirme"
                className="h-12 bg-neutral-950 px-8 text-base font-medium text-neutral-50 hover:bg-neutral-900"
              >
                {t("phases.ctaButton")}
              </EnrollmentCTAPhase>
            </Reveal>
          </div>
        </section>

        {/* PREV / NEXT */}
        {(prev || next) && (
          <nav
            aria-label={t("phases.navAriaLabel")}
            className="border-t border-white/5 px-6 py-16"
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:justify-between">
              {prev ? (
                <Link
                  href={`/fases/${prev.slug}`}
                  className="group flex flex-col gap-1 rounded-xl border border-white/5 bg-neutral-900/30 px-6 py-5 transition-colors hover:border-brand-coral/30"
                >
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
                    <ArrowLeft className="size-3.5" />
                    {t("phases.navPhase", {
                      number: String(prev.order_index).padStart(2, "0"),
                    })}
                  </span>
                  <span className="font-serif text-lg font-medium text-neutral-50 group-hover:text-brand-coral">
                    {localized(prev, "title", locale) ?? prev.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`/fases/${next.slug}`}
                  className="group flex flex-col items-end gap-1 rounded-xl border border-white/5 bg-neutral-900/30 px-6 py-5 transition-colors hover:border-brand-coral/30"
                >
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
                    {t("phases.navPhase", {
                      number: String(next.order_index).padStart(2, "0"),
                    })}
                    <ArrowRight className="size-3.5" />
                  </span>
                  <span className="font-serif text-lg font-medium text-neutral-50 group-hover:text-brand-coral">
                    {localized(next, "title", locale) ?? next.title}
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </nav>
        )}
      </main>
      <DapPublicFooter />
    </div>
  );
}
