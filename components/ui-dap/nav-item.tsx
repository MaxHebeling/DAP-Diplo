import * as React from "react";
import Link, { type LinkProps } from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type DapNavItemProps = Omit<LinkProps, "href"> & {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  className?: string;
  badge?: React.ReactNode;
};

function DapNavItem({
  href,
  icon: Icon,
  label,
  active,
  className,
  badge,
  ...linkProps
}: DapNavItemProps) {
  return (
    <Link
      {...linkProps}
      href={href}
      aria-current={active ? "page" : undefined}
      data-slot="dap-nav-item"
      className={cn(
        "group/nav-item relative flex items-center gap-3 rounded-lg px-4 py-3 font-inter text-base font-medium transition-colors",
        active
          ? "border-l-2 border-brand-coral bg-brand-violet/10 text-text-primary"
          : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
        className,
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.8} />
      <span className="truncate">{label}</span>
      {badge ? <span className="ml-auto">{badge}</span> : null}
    </Link>
  );
}

export { DapNavItem };
