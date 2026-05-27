import { getTranslations } from "next-intl/server";
import { Calendar, GraduationCap, Layers, Users } from "lucide-react";

import { DapStat } from "@/components/ui-dap/stat";
import { AnimatedNumber } from "./animated-number";

export async function StatsStripV2() {
  const t = await getTranslations("Landing");
  return (
    <section className="border-y border-white/[0.06] bg-surface-base px-6 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        <DapStat
          icon={Layers}
          value={<AnimatedNumber value={9} />}
          label={t("stats.blocks")}
        />
        <DapStat
          icon={GraduationCap}
          value={<AnimatedNumber value={72} />}
          label={t("stats.modules")}
          accent="coral"
        />
        <DapStat
          icon={Calendar}
          value={<AnimatedNumber value={18} suffix={t("stats.monthsSuffix")} />}
          label={t("stats.duration")}
          accent="violet"
        />
        <DapStat
          icon={Users}
          value={<AnimatedNumber value={25} prefix="$" suffix={t("stats.perMonthSuffix")} />}
          label={t("stats.subscription")}
          accent="amber"
        />
      </div>
    </section>
  );
}
