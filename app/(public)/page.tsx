import { getTranslations } from "next-intl/server";

import { signOutAction } from "@/lib/auth/actions";

import { HeroSectionV2 } from "@/components/landing/hero-section-v2";
import { StatsStripV2 } from "@/components/landing/stats-strip-v2";
import { PhasesGridV2 } from "@/components/landing/phases-grid-v2";
import { GlobalReachSection } from "@/components/landing/global-reach-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AcademicRecognitionSection } from "@/components/landing/academic-recognition-section";
import { ModuleStructure } from "@/components/landing/module-structure";
import { DimensionsTimeline } from "@/components/landing/dimensions-timeline";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { DapPublicHeader } from "@/components/layouts/dap-public-header";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";

export default async function LandingPage() {
  const t = await getTranslations("PublicPages");

  const HEADER_LINKS = [
    { href: "/como-funciona", label: t("nav.comoFunciona") },
    { href: "#bloques", label: t("nav.bloques") },
    { href: "/rangos", label: t("nav.dimensiones") },
    { href: "/precios", label: t("nav.precios") },
    { href: "#faq", label: t("nav.preguntas") },
  ];

  // Skip getUser() en landings públicas — esto las hace estáticas
  // (cacheables por CDN). Usuarios logueados que aterricen acá ven
  // botón "Login" en el header, no su avatar. Trade-off aceptable
  // para SEO/perf: el header de logueados vive en /dashboard.
  const headerUser = null;

  return (
    <div className="flex flex-1 flex-col bg-surface-base text-text-primary">
      <DapPublicHeader
        links={HEADER_LINKS}
        user={headerUser}
        onSignOut={signOutAction}
      />
      <main className="flex flex-1 flex-col">
        <HeroSectionV2 />
        <StatsStripV2 />
        <PhasesGridV2 />
        <GlobalReachSection />
        <HowItWorks />
        <AcademicRecognitionSection />
        <ModuleStructure />
        <DimensionsTimeline />
        <FaqSection />
        <FinalCta />
      </main>
      <DapPublicFooter />
    </div>
  );
}
