import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  CreditCard,
  Layers,
  Pause,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
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
import { Reveal } from "@/components/landing/reveal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("howItWorks.metaTitle"),
    description: t("howItWorks.metaDescription"),
    alternates: { canonical: "/como-funciona" },
    openGraph: {
      type: "website",
      url: "/como-funciona",
      title: t("howItWorks.ogTitle"),
      description: t("howItWorks.ogDescription"),
    },
  };
}

export default async function ComoFuncionaPage() {
  const t = await getTranslations("PublicPages");
  const supabase = await createClient();

  const STEPS = [
    {
      icon: ShieldCheck,
      title: t("howItWorks.steps.step1Title"),
      body: t("howItWorks.steps.step1Body"),
    },
    {
      icon: CreditCard,
      title: t("howItWorks.steps.step2Title"),
      body: t("howItWorks.steps.step2Body"),
    },
    {
      icon: CalendarClock,
      title: t("howItWorks.steps.step3Title"),
      body: t("howItWorks.steps.step3Body"),
    },
    {
      icon: Award,
      title: t("howItWorks.steps.step4Title"),
      body: t("howItWorks.steps.step4Body"),
    },
  ] as const;

  const WEEK = [
    {
      day: t("howItWorks.week.day1"),
      icon: BookOpen,
      title: t("howItWorks.week.day1Title"),
      body: t("howItWorks.week.day1Body"),
    },
    {
      day: t("howItWorks.week.day2"),
      icon: Sparkles,
      title: t("howItWorks.week.day2Title"),
      body: t("howItWorks.week.day2Body"),
    },
    {
      day: t("howItWorks.week.day3"),
      icon: CalendarClock,
      title: t("howItWorks.week.day3Title"),
      body: t("howItWorks.week.day3Body"),
    },
    {
      day: t("howItWorks.week.day4"),
      icon: Radio,
      title: t("howItWorks.week.day4Title"),
      body: t("howItWorks.week.day4Body"),
    },
    {
      day: t("howItWorks.week.day5"),
      icon: Users,
      title: t("howItWorks.week.day5Title"),
      body: t("howItWorks.week.day5Body"),
    },
  ];

  const FIVE_PARTS = [
    {
      n: "01",
      title: t("howItWorks.fiveParts.part1Title"),
      body: t("howItWorks.fiveParts.part1Body"),
    },
    {
      n: "02",
      title: t("howItWorks.fiveParts.part2Title"),
      body: t("howItWorks.fiveParts.part2Body"),
    },
    {
      n: "03",
      title: t("howItWorks.fiveParts.part3Title"),
      body: t("howItWorks.fiveParts.part3Body"),
    },
    {
      n: "04",
      title: t("howItWorks.fiveParts.part4Title"),
      body: t("howItWorks.fiveParts.part4Body"),
    },
    {
      n: "05",
      title: t("howItWorks.fiveParts.part5Title"),
      body: t("howItWorks.fiveParts.part5Body"),
    },
  ];

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
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-28 sm:py-32">
          {/* Background image — leadership dashboard scene */}
          <Image
            src="/como-funciona-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-40 object-cover opacity-55"
          />
          {/* Tinted overlay para legibilidad del texto */}
          <div className="absolute inset-0 -z-30 bg-gradient-to-b from-surface-base/75 via-surface-base/55 to-surface-base" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.32),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.24),transparent_60%)]" />

          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("howItWorks.heroEyebrow")}
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              {t("howItWorks.heroTitlePre")}
              <span className="gradient-text">
                {t("howItWorks.heroTitleAccent")}
              </span>
              {t("howItWorks.heroTitlePost")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base text-text-secondary md:text-lg">
              {t("howItWorks.heroBody")}
            </p>
          </div>
        </section>

        {/* 4 pasos */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                {t("howItWorks.stepsEyebrow")}
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                {t("howItWorks.stepsHeadingPre")}
                <span className="gradient-text">
                  {t("howItWorks.stepsHeadingAccent")}
                </span>
                {t("howItWorks.stepsHeadingPost")}
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.title} delay={i * 0.06}>
                    <div className="flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6">
                      <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-brand-violet/10 text-brand-violet">
                        <Icon className="size-6" strokeWidth={1.8} />
                      </div>
                      <p className="mb-2 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                        {t("howItWorks.stepLabel", {
                          number: String(i + 1).padStart(2, "0"),
                        })}
                      </p>
                      <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                        {step.title}
                      </h3>
                      <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                        {step.body}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cronograma semanal */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                {t("howItWorks.weekEyebrow")}
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                {t("howItWorks.weekHeadingPre")}
                <span className="gradient-text">
                  {t("howItWorks.weekHeadingAccent")}
                </span>
                {t("howItWorks.weekHeadingPost")}
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {WEEK.map((d, i) => {
                const Icon = d.icon;
                return (
                  <Reveal key={d.day} delay={i * 0.05}>
                    <div className="rounded-xl border border-white/[0.06] bg-surface-elevated p-6">
                      <Icon
                        className="mb-4 size-6 text-brand-coral"
                        strokeWidth={1.8}
                      />
                      <p className="mb-1 font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                        {d.day}
                      </p>
                      <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
                        {d.title}
                      </h3>
                      <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                        {d.body}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5 partes del módulo */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                {t("howItWorks.partsEyebrow")}
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                {t("howItWorks.partsHeadingPre")}
                <span className="gradient-text">
                  {t("howItWorks.partsHeadingAccent")}
                </span>
                {t("howItWorks.partsHeadingPost")}
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {FIVE_PARTS.map((p, i) => (
                <Reveal key={p.n} delay={i * 0.04}>
                  <div className="h-full rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-colors hover:border-brand-coral/30">
                    <p className="gradient-text mb-4 font-grotesk text-h2 font-bold leading-none">
                      {p.n}
                    </p>
                    <h3 className="mb-3 font-grotesk text-h4 font-semibold text-text-primary">
                      {p.title}
                    </h3>
                    <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pausa automática */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-xl border border-brand-coral/25 bg-brand-coral/[0.04] p-8 sm:p-10">
                <Pause
                  className="mb-4 size-7 text-brand-coral"
                  strokeWidth={2}
                />
                <h3 className="mb-3 font-grotesk text-h2 font-bold text-text-primary">
                  {t("howItWorks.missedWeekTitle")}
                </h3>
                <p className="font-inter text-base leading-relaxed text-text-secondary">
                  {t("howItWorks.missedWeekBodyPre")}
                  <strong className="text-text-primary">
                    {t("howItWorks.missedWeekBodyStrong")}
                  </strong>
                  {t("howItWorks.missedWeekBodyPost")}
                </p>
                <p className="mt-4 font-inter text-sm text-text-tertiary">
                  {t("howItWorks.missedWeekNote")}
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Resumen visual */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="text-center">
                <Layers className="mx-auto mb-3 size-6 text-brand-violet" />
                <p className="font-grotesk text-h2 font-bold gradient-text">9</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  {t("howItWorks.statBlocks")}
                </p>
              </div>
              <div className="text-center">
                <BookOpen className="mx-auto mb-3 size-6 text-brand-coral" />
                <p className="font-grotesk text-h2 font-bold gradient-text">72</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  {t("howItWorks.statModules")}
                </p>
              </div>
              <div className="text-center">
                <CalendarClock className="mx-auto mb-3 size-6 text-brand-amber" />
                <p className="font-grotesk text-h2 font-bold gradient-text">18</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  {t("howItWorks.statMonths")}
                </p>
              </div>
              <div className="text-center">
                <ShieldCheck className="mx-auto mb-3 size-6 text-brand-violet" />
                <p className="font-grotesk text-h2 font-bold gradient-text">9</p>
                <p className="font-inter text-xs uppercase tracking-widest text-text-tertiary">
                  {t("howItWorks.statDimensions")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative isolate overflow-hidden border-t border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("howItWorks.ctaTitlePre")}
              <span className="gradient-text">
                {t("howItWorks.ctaTitleAccent")}
              </span>
              {t("howItWorks.ctaTitlePost")}
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              {t("howItWorks.ctaBody")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <EnrollmentCTA href="/suscribirme" size="lg">
                {t("howItWorks.ctaSubscribe")}
                <ArrowRight />
              </EnrollmentCTA>
              <DapButton
                render={<Link href="/precios" />}
                variant="secondary"
                size="lg"
              >
                {t("howItWorks.ctaSeePricing")}
              </DapButton>
            </div>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
