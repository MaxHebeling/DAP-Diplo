import { ArrowRight, BookOpen, Crown, Heart } from "lucide-react";

import { DapBlockCard } from "@/components/ui-dap/block-card";
import { DapButton } from "@/components/ui-dap/button";
import { DapPublicFooter } from "@/components/layouts/dap-public-footer";
import { DapPublicHeader } from "@/components/layouts/dap-public-header";

export const metadata = { title: "DAP — Public layout preview (dev)" };

export default function PublicLayoutDevPage() {
  return (
    <div className="min-h-screen bg-surface-base font-inter text-text-primary">
      <DapPublicHeader />

      <main>
        <section className="relative overflow-hidden bg-gradient-cosmic">
          <div className="absolute inset-0 -z-0 opacity-60 [background:radial-gradient(circle_at_30%_50%,rgba(123,97,255,0.35),transparent_55%),radial-gradient(circle_at_70%_55%,rgba(255,77,109,0.25),transparent_55%)]" />
          <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-text-secondary backdrop-blur">
              Diplomado Apostólico Pastoral · 18 meses
            </p>
            <h1 className="mx-auto max-w-3xl gradient-text font-grotesk text-display font-bold leading-[1.05]">
              Formación integral para pastores y líderes
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-text-secondary md:text-lg">
              9 bloques. 72 módulos. Espiritualidad, liderazgo, gobierno,
              finanzas, empresas y tecnología. Premium, en español.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <DapButton size="lg">
                Empezar ahora <ArrowRight />
              </DapButton>
              <DapButton variant="secondary" size="lg">
                Ver los bloques
              </DapButton>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20" id="bloques">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Los 9 bloques
          </p>
          <h2 className="mb-12 font-grotesk text-h1 font-bold leading-tight">
            Una sola jornada apostólica
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DapBlockCard
              order={1}
              title="Fundamentos Espirituales"
              description="Identidad, llamado, doctrina."
              icon={BookOpen}
              href="#"
            />
            <DapBlockCard
              order={2}
              title="Identidad y Carácter"
              description="Formación interior del líder."
              icon={Heart}
              href="#"
            />
            <DapBlockCard
              order={3}
              title="Liderazgo y Discipulado"
              description="Cómo formar a otros."
              icon={Crown}
              href="#"
            />
          </div>
        </section>
      </main>

      <DapPublicFooter />
    </div>
  );
}
