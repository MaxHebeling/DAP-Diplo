import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarModule = {
  id: string;
  slug: string;
  order_index: number;
  title: string;
  completed: boolean;
};

type ModuleSidebarProps = {
  blockTitle: string;
  blockOrderIndex: number;
  blockSlug: string;
  modules: SidebarModule[];
  currentModuleSlug: string;
};

export function ModuleSidebar({
  blockTitle,
  blockOrderIndex,
  blockSlug,
  modules,
  currentModuleSlug,
}: ModuleSidebarProps) {
  const completedCount = modules.filter((m) => m.completed).length;
  const pct = modules.length === 0 ? 0 : Math.round((completedCount / modules.length) * 100);

  return (
    <aside className="border-r bg-card/40">
      <div className="border-b p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-brand-coral">
          Bloque {String(blockOrderIndex).padStart(2, "0")}
        </p>
        <Link
          href={`/bloques/${blockSlug}`}
          className="font-serif text-lg font-medium leading-tight hover:text-brand-coral"
        >
          {blockTitle}
        </Link>
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} / {modules.length} módulos
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand-coral transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <nav
        aria-label="Módulos del bloque"
        className="max-h-[calc(100vh-200px)] overflow-y-auto p-2"
      >
        <ol className="space-y-0.5">
          {modules.map((m) => {
            const isCurrent = m.slug === currentModuleSlug;
            return (
              <li key={m.id}>
                <Link
                  href={`/bloques/${blockSlug}/modulos/${m.slug}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isCurrent
                      ? "bg-brand-coral/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium tabular-nums",
                      m.completed
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : isCurrent
                          ? "bg-brand-coral text-brand-coral-foreground"
                          : "border text-muted-foreground",
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
