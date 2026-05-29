import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

export type SidebarModule = {
  id: string;
  slug: string;
  order_index: number;
  title: string;
  completed: boolean;
};

type ModuleSidebarProps = {
  phaseTitle: string;
  phaseOrderIndex: number;
  phaseSlug: string;
  modules: SidebarModule[];
  currentModuleSlug: string;
};

export async function ModuleSidebar({
  phaseTitle,
  phaseOrderIndex,
  phaseSlug,
  modules,
  currentModuleSlug,
}: ModuleSidebarProps) {
  const t = await getTranslations("Module");
  const completedCount = modules.filter((m) => m.completed).length;
  const pct = modules.length === 0 ? 0 : Math.round((completedCount / modules.length) * 100);

  return (
    <aside className="hidden border-r border-white/[0.06] bg-surface-base lg:block">
      <div className="border-b border-white/[0.06] p-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-coral">
          {t("sidebar.phase", { number: String(phaseOrderIndex).padStart(2, "0") })}
        </p>
        <Link
          href={`/fases/${phaseSlug}`}
          className="font-grotesk text-lg font-bold leading-tight text-white hover:text-brand-coral"
        >
          {phaseTitle}
        </Link>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-white/60">
            <span>
              {t("sidebar.modulesCount", { completed: completedCount, total: modules.length })}
            </span>
            <span className="tabular-nums text-white/80">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-coral transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label={t("sidebar.navLabel")}
        className="max-h-[calc(100vh-200px)] overflow-y-auto p-2"
      >
        <ol className="space-y-0.5">
          {modules.map((m) => {
            const isCurrent = m.slug === currentModuleSlug;
            return (
              <li key={m.id}>
                <Link
                  href={`/fases/${phaseSlug}/modulos/${m.slug}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isCurrent
                      ? "bg-brand-coral/15 text-white"
                      : "text-white/70 hover:bg-white/[0.04] hover:text-white",
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                      m.completed
                        ? "bg-emerald-500/20 text-emerald-300"
                        : isCurrent
                          ? "bg-brand-coral text-white"
                          : "border border-white/15 text-white/70",
                    )}
                  >
                    {m.completed ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : (
                      String(m.order_index).padStart(2, "0")
                    )}
                  </span>
                  <span className="truncate">{m.title}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
