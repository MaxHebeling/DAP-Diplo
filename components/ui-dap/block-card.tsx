import { Link } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type DapBlockCardProps = {
  order: number;
  title: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
};

function DapBlockCard({
  order,
  title,
  description,
  icon: Icon,
  href,
  className,
}: DapBlockCardProps) {
  const content = (
    <div
      data-slot="dap-block-card"
      className={cn(
        "group/block relative flex h-full flex-col rounded-xl border border-white/[0.06] bg-surface-elevated p-6 transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-brand-violet/30 hover:shadow-glow-violet",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="gradient-text font-grotesk text-h2 font-bold leading-none">
          {String(order).padStart(2, "0")}
        </span>
        <div className="flex size-10 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
          <Icon className="size-5" strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="mb-2 font-grotesk text-h4 font-semibold text-text-primary">
        {title}
      </h3>
      {description && (
        <p className="font-inter text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}

export { DapBlockCard };
