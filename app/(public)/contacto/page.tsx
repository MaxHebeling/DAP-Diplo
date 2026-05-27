import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CreditCard,
  HelpCircle,
  Mail,
  MessageSquare,
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
import { Reveal } from "@/components/landing/reveal";

const SUPPORT_EMAIL = "contacto@dapglobal.org";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("contact.metaTitle"),
    description: t("contact.metaDescription"),
    alternates: { canonical: "/contacto" },
    openGraph: {
      type: "website",
      url: "/contacto",
      title: t("contact.ogTitle"),
      description: t("contact.ogDescription"),
    },
  };
}

export default async function ContactoPage() {
  const t = await getTranslations("PublicPages");
  const supabase = await createClient();

  const TOPICS = [
    {
      icon: HelpCircle,
      title: t("contact.topics.topic1Title"),
      body: t("contact.topics.topic1Body"),
      subject: t("contact.topics.topic1Subject"),
    },
    {
      icon: CreditCard,
      title: t("contact.topics.topic2Title"),
      body: t("contact.topics.topic2Body"),
      subject: t("contact.topics.topic2Subject"),
    },
    {
      icon: MessageSquare,
      title: t("contact.topics.topic3Title"),
      body: t("contact.topics.topic3Body"),
      subject: t("contact.topics.topic3Subject"),
    },
    {
      icon: Sparkles,
      title: t("contact.topics.topic4Title"),
      body: t("contact.topics.topic4Body"),
      subject: t("contact.topics.topic4Subject"),
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
          <div className="absolute inset-0 -z-30 bg-gradient-cosmic" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.32),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.24),transparent_60%)]" />

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("contact.heroEyebrow")}
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              <span className="gradient-text">
                {t("contact.heroTitleAccent")}
              </span>
              {t("contact.heroTitlePost")}
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              {t("contact.heroBody")}
            </p>
          </div>
        </section>

        {/* Email principal — card destacada */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="group relative flex flex-col items-center gap-6 rounded-2xl border border-white/[0.08] bg-surface-elevated p-10 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/40 hover:shadow-glow-violet sm:flex-row sm:text-left"
              >
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-brand-violet/15 text-brand-violet transition-colors group-hover:bg-brand-violet/25">
                  <Mail className="size-7" strokeWidth={1.8} />
                </div>
                <div className="flex-1">
                  <p className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                    {t("contact.emailLabel")}
                  </p>
                  <p className="mt-1 font-grotesk text-h3 font-bold text-text-primary sm:text-h2">
                    {SUPPORT_EMAIL}
                  </p>
                  <p className="mt-2 font-inter text-sm text-text-secondary">
                    {t("contact.emailResponse")}
                  </p>
                </div>
                <ArrowRight className="size-5 text-text-tertiary transition-all group-hover:translate-x-1 group-hover:text-brand-coral" />
              </a>
            </Reveal>
          </div>
        </section>

        {/* Topics — qué escribirnos */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                {t("contact.topicsEyebrow")}
              </p>
              <h2 className="mb-12 max-w-2xl font-grotesk text-h1 font-bold leading-tight text-text-primary">
                {t("contact.topicsHeadingPre")}
                <span className="gradient-text">
                  {t("contact.topicsHeadingAccent")}
                </span>
                {t("contact.topicsHeadingPost")}
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {TOPICS.map((topic, i) => {
                const Icon = topic.icon;
                const subject = encodeURIComponent(topic.subject);
                return (
                  <Reveal key={topic.title} delay={i * 0.05}>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}?subject=${subject}`}
                      className="group flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet"
                    >
                      <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </div>
                      <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
                        {topic.title}
                      </h3>
                      <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                        {topic.body}
                      </p>
                      <p className="mt-4 inline-flex items-center gap-1 font-inter text-xs font-medium text-brand-coral">
                        {t("contact.topicsWrite")}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </p>
                    </a>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ shortcut */}
        <section className="border-b border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-xl border border-white/[0.08] bg-surface-elevated p-8 text-center sm:p-10">
                <HelpCircle
                  className="mx-auto mb-4 size-7 text-brand-coral"
                  strokeWidth={2}
                />
                <h3 className="mb-3 font-grotesk text-h3 font-bold text-text-primary">
                  {t("contact.faqTitle")}
                </h3>
                <p className="mb-6 font-inter text-base leading-relaxed text-text-secondary">
                  {t("contact.faqBody")}
                </p>
                <DapButton
                  render={<Link href="/#faq" />}
                  variant="secondary"
                  size="md"
                >
                  {t("contact.faqButton")}
                  <ArrowRight />
                </DapButton>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative isolate overflow-hidden border-t border-white/[0.06] px-6 py-24">
          <div className="absolute inset-0 -z-20 bg-gradient-cosmic opacity-90" />
          <div className="absolute inset-0 -z-10 opacity-70 [background:radial-gradient(50%_50%_at_50%_50%,rgba(123,97,255,0.35),transparent_55%)]" />
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
              {t("contact.ctaTitlePre")}
              <span className="gradient-text">
                {t("contact.ctaTitleAccent")}
              </span>
              {t("contact.ctaTitlePost")}
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              {t("contact.ctaBody")}
            </p>
            <div className="mt-10">
              <EnrollmentCTA href="/suscribirme" size="lg">
                {t("contact.ctaButton")}
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
