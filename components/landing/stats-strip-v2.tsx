import { Calendar, GraduationCap, Layers, Users } from "lucide-react";

import { DapStat } from "@/components/ui-dap/stat";
import { AnimatedNumber } from "./animated-number";

export function StatsStripV2() {
  return (
    <section className="border-y border-white/[0.06] bg-surface-base px-6 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        <DapStat
          icon={Layers}
          value={<AnimatedNumber value={9} />}
          label="Bloques temáticos"
        />
        <DapStat
          icon={GraduationCap}
          value={<AnimatedNumber value={200} />}
          label="Módulos premium"
          accent="coral"
        />
        <DapStat
          icon={Calendar}
          value={<AnimatedNumber value={18} suffix=" meses" />}
          label="Formación integral"
          accent="violet"
        />
        <DapStat
          icon={Users}
          value={<AnimatedNumber value={25} prefix="$" suffix="/mes" />}
          label="Suscripción mensual"
          accent="amber"
        />
      </div>
    </section>
  );
}
