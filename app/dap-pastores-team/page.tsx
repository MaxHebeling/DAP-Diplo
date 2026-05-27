import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PromoHero } from "./_components/promo-hero";
import { PromoMessage } from "./_components/promo-message";
import { PromoRule } from "./_components/promo-rule";
import { PromoNetwork } from "./_components/promo-network";
import { PromoBenefits } from "./_components/promo-benefits";
import { PromoFinalCta } from "./_components/promo-final-cta";

/**
 * Página privada para una promoción dirigida a pastores y líderes.
 * No indexada, no listada en navegación pública ni en sitemap.
 * Solo accesible vía URL directa.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PastoresTeam");
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        "max-image-preview": "none",
        "max-snippet": -1,
      },
    },
    // Forzamos exclusión del sitemap a nivel head para crawlers que ignoren robots.
    alternates: { canonical: undefined },
  };
}

export default async function DapPastoresTeamPage() {
  const t = await getTranslations("PastoresTeam");
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#04081A] text-text-primary">
      {/* Fondo cinematográfico global (vertical gradient + grano sutil) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 [background:radial-gradient(120%_80%_at_50%_0%,#0A1633_0%,#04081A_60%,#020410_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.08] mix-blend-soft-light [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22/></svg>')]"
      />

      <PromoHero />
      <PromoMessage />
      <PromoRule />
      <PromoNetwork />
      <PromoBenefits />
      <PromoFinalCta />

      {/* Footer mínimo, sin nav, sin links públicos. */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10 text-center">
        <p className="font-inter text-[11px] uppercase tracking-[0.32em] text-text-tertiary">
          {t("footer.tagline")}
        </p>
        <p className="mt-2 font-inter text-xs text-text-tertiary">
          {t("footer.privacy")}
        </p>
      </footer>
    </main>
  );
}
