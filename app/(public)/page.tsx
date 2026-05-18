import { SiteHeader, type HeaderUser } from "@/components/landing/site-header";
import { HeroSection } from "@/components/landing/hero-section";
import { WhySection } from "@/components/landing/why-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PhasesGrid } from "@/components/landing/phases-grid";
import { ModuleStructure } from "@/components/landing/module-structure";
import { DimensionsTimeline } from "@/components/landing/dimensions-timeline";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "DAP — Diplomado Apostólico Pastoral | Formación integral para pastores",
  description:
    "18 meses de formación apostólica integral. 9 fases, 200 módulos, 9 dimensiones ministeriales. Espiritualidad + liderazgo + gobierno + finanzas + empresas + tecnología. $25/mes.",
};

export default async function LandingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: HeaderUser = null;
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
    <div className="flex flex-1 flex-col bg-neutral-950 text-neutral-50">
      <SiteHeader user={headerUser} />
      <main className="flex flex-1 flex-col">
        <HeroSection />
        <WhySection />
        <HowItWorks />
        <PhasesGrid />
        <ModuleStructure />
        <DimensionsTimeline />
        <FaqSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
