import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type DapStatProps = {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  /** Tinte del icono. Por defecto brand-violet. */
  accent?: "violet" | "coral" | "amber";
  className?: string;
};

const ACCENT: Record<NonNullable<DapStatProps["accent"]>, string> = {
  violet: "bg-brand-violet/10 text-brand-violet",
  coral: "bg-brand-coral/10 text-brand-coral",
  amber: "bg-brand-amber/10 text-brand-amber",
};

function DapStat({
  icon: Icon,
  value,
  label,
  accent = "violet",
  className,
}: DapStatProps) {
  return (
    <div
      data-slot="dap-stat"
      className={cn("flex items-center gap-4", className)}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-lg",
          ACCENT[accent],
        )}
      >
        <Icon className="size-6" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="font-grotesk text-h3 font-bold leading-none text-text-primary">
          {value}
        </p>
        <p className="mt-1 font-inter text-sm text-text-secondary">{label}</p>
      </div>
    </div>
  );
}

export { DapStat };
