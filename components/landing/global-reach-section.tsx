import { Church, Globe2, UserCheck, Users } from "lucide-react";

import { DapStat } from "@/components/ui-dap/stat";
import { Globe } from "./globe";

export function GlobalReachSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-surface-base px-6 py-28 sm:py-36">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        {/* Copy + stats */}
        <div>
          <p className="mb-4 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            Alcance global
          </p>
          <h2 className="font-grotesk text-h1 font-bold leading-tight text-text-primary">
            Pastores de{" "}
            <span className="gradient-text">50 naciones</span> ya están en el DAP
          </h2>
          <p className="mt-6 max-w-xl font-inter text-base leading-relaxed text-text-secondary">
            Desde Argentina hasta España, desde México hasta Filipinas, una
            red de líderes apostólicos formándose juntos para transformar
            su generación.
          </p>
          {/* TODO: reemplazar números cuando tengamos datos reales del CRM. */}
          <div className="mt-10 grid grid-cols-2 gap-8">
            <DapStat icon={Globe2} value="+50" label="Naciones" />
            <DapStat
              icon={Users}
              value="+12K"
              label="Estudiantes"
              accent="coral"
            />
            <DapStat
              icon={Church}
              value="+1,200"
              label="Iglesias impactadas"
              accent="amber"
            />
            <DapStat
              icon={UserCheck}
              value="+150"
              label="Mentores expertos"
            />
          </div>
        </div>

        {/* Globe */}
        <div className="flex justify-center">
          <Globe size="lg" intensity="cosmic" className="hidden lg:block" />
          <Globe size="md" intensity="cosmic" className="block lg:hidden" />
        </div>
      </div>
    </section>
  );
}
