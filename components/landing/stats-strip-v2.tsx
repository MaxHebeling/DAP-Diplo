import { Calendar, GraduationCap, Layers, Users } from "lucide-react";

import { DapStat } from "@/components/ui-dap/stat";

export function StatsStripV2() {
  return (
    <section className="border-y border-white/[0.06] bg-surface-base px-6 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        <DapStat icon={Layers} value="9" label="Bloques temáticos" />
        <DapStat icon={GraduationCap} value="200" label="Módulos premium" accent="coral" />
        <DapStat icon={Calendar} value="18 meses" label="Formación integral" accent="violet" />
        <DapStat icon={Users} value="$25/mes" label="Suscripción mensual" accent="amber" />
      </div>
    </section>
  );
}
