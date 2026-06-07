import { getTranslations } from "next-intl/server";

import { DapCard } from "@/components/ui-dap/card";

export async function ProgressBar({
  completedCount,
  completionPct,
}: {
  completedCount: number;
  completionPct: number;
}) {
  const t = await getTranslations("Student");
  return (
    <DapCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
            {t("dashboard.progress.label")}
          </p>
          <p className="mt-1 font-grotesk text-h3 font-semibold text-text-primary">
            {t.rich("dashboard.progress.count", {
              count: completedCount,
              muted: (chunks) => (
                <span className="text-text-secondary">{chunks}</span>
              ),
            })}
          </p>
        </div>
        <p className="font-grotesk text-h2 font-bold text-brand-coral">
          {completionPct}%
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-coral transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>
    </DapCard>
  );
}
