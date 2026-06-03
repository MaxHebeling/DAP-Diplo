import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Check,
  CreditCard,
  Pause,
  Radio,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { getTranslations } from "next-intl/server";

import { signOutAction } from "@/lib/auth/actions";
import {
  DapPublicHeader,
  type DapHeaderUser,
} from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { DapButton } from "@/components/ui-dap/button";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
import { Reveal } from "@/components/landing/reveal";
import {
  breadcrumbListSchema,
  faqPageSchema,
  jsonLd,
  productOfferSchema,
  SITE_URL,
} from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PublicPages");
  return {
    title: t("pricing.metaTitle"),
    description: t("pricing.metaDescription"),
    alternates: { canonical: "/precios" },
    openGraph: {
      type: "website",
      url: "/precios",
      title: t("pricing.ogTitle"),
      description: t("pricing.ogDescription"),
    },
  };
}

export default async function PreciosPage() {
  const t = await getTranslations("PublicPages");

  const INCLUDED = [
    {
      icon: BookOpen,
      title: t("pricing.included.item1Title"),
      body: t("pricing.included.item1Body"),
    },
    {
      icon: Radio,
      title: t("pricing.included.item2Title"),
      body: t("pricing.included.item2Body"),
    },
    {
      icon: Users,
      title: t("pricing.included.item3Title"),
      body: t("pricing.included.item3Body"),
    },
    {
      icon: Sparkles,
      title: t("pricing.included.item4Title"),
      body: t("pricing.included.item4Body"),
    },
    {
      icon: Pause,
      title: t("pricing.included.item5Title"),
      body: t("pricing.included.item5Body"),
    },
  ];

  const NOT_INCLUDED = [
    t("pricing.notIncluded.item1"),
    t("pricing.notIncluded.item2"),
    t("pricing.notIncluded.item3"),
    t("pricing.notIncluded.item4"),
  ];

  // Skip auth check — landing pública estática (cacheable por CDN).
  const headerUser: DapHeaderUser = null;

  // Schema FAQ específico de pricing — diferente al de la home (la home
  // cubre dudas generales del programa; acá foco en precio/billing).
  const PRICING_FAQS = [
    {
      q: "¿Cuánto cuesta el DAP?",
      a: "$25 USD por mes vía tarjeta (Stripe), o 30.000 ARS/mes vía Mercado Pago en Argentina (con opción de pagar en efectivo en RapiPago, PagoFácil o transferencia). Sin matrícula, sin cuotas anuales, sin costos ocultos.",
    },
    {
      q: "¿Hay compromiso de permanencia?",
      a: "No. Cancelás cuando quieras desde tu dashboard. Si dejás de avanzar en los módulos, el cobro se pausa automáticamente — no te cobramos por meses inactivos.",
    },
    {
      q: "¿Qué métodos de pago aceptan?",
      a: "Internacional: tarjeta de crédito/débito vía Stripe ($25 USD/mes). Argentina: Mercado Pago (tarjeta, débito, saldo MP, RapiPago, PagoFácil, transferencia bancaria, Western Union) por 30.000 ARS/mes.",
    },
    {
      q: "¿El precio incluye certificado y materiales?",
      a: "Sí. Acceso a los 72 módulos, MasterClass en vivo, comunidad privada, Tutor IA del DAP, corrección personalizada del Dr. Max Hebeling, certificados de bloque y dimensión. Todo incluido sin cargos extra.",
    },
    {
      q: "¿Hay becas o descuentos?",
      a: "Sí. El DAP otorga becas selectivas (DAP-HONOR y DAP-VIP) a pastores con redes establecidas y a líderes con llamado claro. Las becas se gestionan por invitación directa del Dr. Max Hebeling.",
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      {/* JSON-LD schema enrichment para /precios — productOffer + FAQ + breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productOfferSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqPageSchema(PRICING_FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbListSchema([
              { name: "Inicio", url: SITE_URL },
              { name: "Precios", url: `${SITE_URL}/precios` },
            ]),
          ),
        }}
      />
      <DapPublicHeader user={headerUser} onSignOut={signOutAction} />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-white/[0.06] px-6 py-28 sm:py-32">
          {/* Portal cósmico — backdrop del hero de pricing */}
          <Image
            src="/precios-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-40 object-cover opacity-55"
          />
          <div className="absolute inset-0 -z-30 bg-gradient-to-b from-surface-base/75 via-surface-base/55 to-surface-base" />
          <div className="absolute inset-0 -z-20 opacity-50 [background:radial-gradient(60%_45%_at_30%_42%,rgba(123,97,255,0.32),transparent_60%),radial-gradient(50%_40%_at_72%_58%,rgba(255,77,109,0.24),transparent_60%)]" />

          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("pricing.heroEyebrow")}
            </p>
            <h1 className="font-grotesk text-display font-bold leading-[1.05] text-text-primary">
              <span className="gradient-text">
                {t("pricing.heroTitleAccent")}
              </span>
              {t("pricing.heroTitlePost")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-inter text-base text-text-secondary md:text-lg">
              {t("pricing.heroBody")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <EnrollmentCTA href="/suscribirme" size="lg">
                {t("pricing.heroStart")}
                <ArrowRight />
              </EnrollmentCTA>
              <DapButton
                render={<Link href="/como-funciona" />}
                variant="secondary"
                size="lg"
              >
                {t("pricing.heroHowItWorks")}
              </DapButton>
            </div>
            <p className="mt-6 font-inter text-xs text-text-tertiary">
              {t("pricing.heroNote")}
            </p>
          </div>
        </section>

        {/* Lo que incluye */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                {t("pricing.includedEyebrow")}
              </p>
              <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
                {t("pricing.includedHeadingPre")}
                <span className="gradient-text">
                  {t("pricing.includedHeadingAccent")}
                </span>
                {t("pricing.includedHeadingPost")}
              </h2>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {INCLUDED.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.title} delay={i * 0.04}>
                    <div className="flex h-full gap-4 rounded-xl border border-white/[0.06] bg-surface-elevated p-6">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
                        <Icon className="size-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
                          {item.title}
                        </h3>
                        <p className="text-justify font-inter text-sm leading-relaxed text-text-secondary">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Lo que NO pagás */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                {t("pricing.notIncludedEyebrow")}
              </p>
              <h2 className="mb-8 font-grotesk text-h2 font-bold leading-tight text-text-primary">
                {t("pricing.notIncludedHeading")}
              </h2>
              <ul className="space-y-3">
                {NOT_INCLUDED.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 font-inter text-base text-text-secondary"
                  >
                    <X
                      className="mt-1 size-4 shrink-0 text-text-tertiary line-through"
                      strokeWidth={2}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* Modelo Netflix explicado */}
        <section className="border-t border-white/[0.06] bg-surface-base px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-xl border border-brand-coral/20 bg-brand-coral/[0.04] p-8">
                <Pause
                  className="mb-4 size-6 text-brand-coral"
                  strokeWidth={2}
                />
                <h3 className="mb-3 font-grotesk text-h3 font-bold text-text-primary">
                  {t("pricing.netflixTitle")}
                </h3>
                <p className="font-inter text-base leading-relaxed text-text-secondary">
                  {t("pricing.netflixBody")}
                </p>
                <p className="mt-4 font-inter text-sm text-text-tertiary">
                  {t("pricing.netflixNote")}
                </p>
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
              {t("pricing.ctaTitlePre")}
              <span className="gradient-text">
                {t("pricing.ctaTitleAccent")}
              </span>
              {t("pricing.ctaTitlePost")}
            </h2>
            <p className="mx-auto mt-6 max-w-xl font-inter text-base text-text-secondary md:text-lg">
              {t("pricing.ctaBody")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <EnrollmentCTA href="/suscribirme" size="lg">
                <CreditCard />
                {t("pricing.ctaSubscribe")}
              </EnrollmentCTA>
              <DapButton
                render={<Link href="/#preguntas" />}
                variant="secondary"
                size="lg"
              >
                {t("pricing.ctaSeeFaq")}
              </DapButton>
            </div>
            <p className="mt-6 font-inter text-xs text-text-tertiary">
              <Check className="-mt-1 mr-1 inline size-3 text-emerald-400" />
              {t("pricing.ctaNote")}
            </p>
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
