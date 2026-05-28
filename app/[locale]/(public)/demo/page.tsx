import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  Lock,
  Sparkles,
} from "lucide-react";

import { getTranslations } from "next-intl/server";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
import { DemoQuiz } from "@/components/demo/demo-quiz";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("demo.metaTitle"),
    description: t("demo.metaDescription"),
    alternates: { canonical: "/demo" },
    openGraph: {
      type: "website",
      url: "/demo",
      title: t("demo.ogTitle"),
      description: t("demo.ogDescription"),
    },
  };
}

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const t = await getTranslations("PublicPages");
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

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      <DapPublicHeader user={headerUser} onSignOut={signOutAction} />

      <main className="flex flex-1 flex-col">
        {/* ───────── HERO ───────── */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-24 sm:py-28">
          <div className="absolute inset-0 -z-30 bg-gradient-cosmic" />
          <div className="absolute inset-0 -z-20 opacity-60 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.35),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.25),transparent_60%)]" />

          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-coral/30 bg-brand-coral/10 px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              <Sparkles className="size-3.5" />
              {t("demo.heroBadge")}
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              {t("demo.heroTitlePre")}
              <span className="gradient-text">{t("demo.heroTitleAccent")}</span>
              {t("demo.heroTitlePost")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base leading-relaxed text-text-secondary md:text-lg">
              {t("demo.heroBody")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-inter text-xs text-text-tertiary">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-brand-coral" />
                {t("demo.heroDuration")}
              </span>
              <span className="text-text-tertiary/50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-brand-coral" />
                {t("demo.heroModule")}
              </span>
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 01: INTRODUCCIÓN ───────── */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("demo.introEyebrow")}
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              {t("demo.introHeading")}
            </h2>
            <div className="space-y-4 font-inter text-base leading-relaxed text-text-secondary">
              <p>
                <strong className="text-text-primary">
                  {t("demo.introObjectiveLabel")}
                </strong>{" "}
                {t("demo.introObjectiveBody")}
              </p>
              <p>
                <strong className="text-text-primary">
                  {t("demo.introRevelationLabel")}
                </strong>{" "}
                {t("demo.introRevelationBody")}
              </p>
              <p>
                <strong className="text-text-primary">
                  {t("demo.introApplicationLabel")}
                </strong>{" "}
                {t("demo.introApplicationBody")}
              </p>
              <p className="border-l-2 border-brand-coral pl-4 italic">
                {t("demo.introVerse")}
              </p>
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 02: ENSEÑANZA (VIDEO) ───────── */}
        <section className="border-b border-white/[0.06] bg-gradient-to-br from-brand-violet/[0.06] via-surface-base to-brand-coral/[0.04] px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("demo.teachingEyebrow")}
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              {t("demo.teachingHeading")}
            </h2>

            <div className="rounded-2xl border border-white/[0.08] bg-surface-elevated/60 p-8 backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
                  <Headphones className="size-7" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-grotesk text-h4 font-semibold text-text-primary">
                    {t("demo.teachingCardTitle")}
                  </p>
                  <p className="mt-1 font-inter text-sm text-text-secondary">
                    {t("demo.teachingCardMeta")}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-center">
                <Clock className="mx-auto mb-2 size-5 text-text-tertiary" />
                <p className="font-grotesk text-sm font-semibold text-text-primary">
                  {t("demo.teachingProductionTitle")}
                </p>
                <p className="mt-1 font-inter text-xs text-text-tertiary">
                  {t("demo.teachingProductionBody")}
                </p>
              </div>

              <p className="mt-6 font-inter text-sm leading-relaxed text-text-secondary">
                {t("demo.teachingDescription")}
              </p>
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 03: ACTIVACIÓN ───────── */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("demo.activationEyebrow")}
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              {t("demo.activationHeading")}
            </h2>

            <div className="space-y-5 font-inter text-base leading-relaxed text-text-secondary">
              <p>
                {t("demo.activationIntroPre")}
                <strong className="text-text-primary">
                  {t("demo.activationIntroStrong")}
                </strong>
                {t("demo.activationIntroPost")}
              </p>
              <ul className="ml-4 list-disc space-y-2 text-sm">
                <li>{t("demo.activationBullet1")}</li>
                <li>{t("demo.activationBullet2")}</li>
                <li>{t("demo.activationBullet3")}</li>
                <li>{t("demo.activationBullet4")}</li>
              </ul>
            </div>

            <div className="mt-8 rounded-xl border border-brand-violet/20 bg-brand-violet/[0.05] p-6">
              <p className="mb-2 font-inter text-xs font-medium uppercase tracking-widest text-brand-violet">
                {t("demo.activationConsignaLabel")}
              </p>
              <p className="font-inter text-base leading-relaxed text-text-primary">
                {t("demo.activationConsignaPre")}
                <em>{t("demo.activationConsignaEm")}</em>
                {t("demo.activationConsignaPost")}
              </p>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-inter text-xs text-text-tertiary">
              <Lock className="size-3.5 text-brand-coral" />
              {t("demo.activationLockPre")}
              <Link href="/suscribirme" className="ml-1 font-semibold text-brand-coral hover:underline">
                {t("demo.activationLockLink")}
              </Link>
              .
            </div>
          </div>
        </section>

        {/* ───────── SECCIÓN 04: EVALUACIÓN (QUIZ INTERACTIVO) ───────── */}
        <section className="border-b border-white/[0.06] bg-gradient-to-br from-brand-coral/[0.04] via-surface-base to-brand-violet/[0.05] px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("demo.evaluationEyebrow")}
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              {t("demo.evaluationHeading")}
            </h2>
            <p className="mb-8 font-inter text-base leading-relaxed text-text-secondary">
              {t("demo.evaluationBodyPre")}
              <strong className="text-text-primary">
                {t("demo.evaluationBodyStrong")}
              </strong>
              {t("demo.evaluationBodyPost")}
            </p>

            <DemoQuiz />
          </div>
        </section>

        {/* ───────── SECCIÓN 05: IMPARTICIÓN ───────── */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("demo.impartationEyebrow")}
            </p>
            <h2 className="mb-6 font-grotesk text-h2 font-bold leading-tight text-text-primary">
              {t("demo.impartationHeading")}
            </h2>

            <div className="rounded-2xl border border-brand-coral/20 bg-gradient-to-br from-brand-coral/[0.05] via-surface-elevated/40 to-brand-violet/[0.05] p-8">
              <p className="font-inter text-lg leading-relaxed text-text-primary italic">
                {t("demo.impartationBody")}
              </p>
              <p className="mt-6 border-l-2 border-brand-coral pl-4 font-inter text-sm text-text-secondary">
                {t("demo.impartationVerse")}
              </p>
            </div>
          </div>
        </section>

        {/* ───────── FOOTER CTA ───────── */}
        <section className="relative isolate overflow-hidden border-y border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              {t("demo.ctaBadge")}
            </p>
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("demo.ctaTitlePre")}
              <span className="gradient-text">{t("demo.ctaTitleAccent")}</span>
              {t("demo.ctaTitlePost")}
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base leading-relaxed text-text-secondary md:text-lg">
              {t("demo.ctaBody")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <EnrollmentCTA href="/suscribirme" size="lg">
                {t("demo.ctaSubscribe")}
                <ArrowRight />
              </EnrollmentCTA>
              <DapButton
                render={<Link href="/como-funciona" />}
                variant="secondary"
                size="lg"
              >
                {t("demo.ctaHowItWorks")}
              </DapButton>
            </div>
            <p className="mt-6 font-inter text-xs text-text-tertiary">
              {t("demo.ctaNote")}
            </p>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
