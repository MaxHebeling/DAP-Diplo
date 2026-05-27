"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, HelpCircle, Search } from "lucide-react";

import { cn } from "@/lib/utils";

type DapStudentTopbarProps = {
  title?: string;
  notificationCount?: number;
  className?: string;
};

export function DapStudentTopbar({
  title,
  notificationCount = 0,
  className,
}: DapStudentTopbarProps) {
  const t = useTranslations("Shell");
  const [query, setQuery] = useState("");

  return (
    <header
      data-slot="dap-student-topbar"
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-surface-base/85 px-6 backdrop-blur-xl",
        className,
      )}
    >
      {title && (
        <h1 className="hidden font-grotesk text-h4 font-semibold text-text-primary md:block">
          {title}
        </h1>
      )}

      <div className="relative ml-auto w-full max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder={t("studentTopbar.searchPlaceholder")}
          aria-label={t("studentTopbar.searchAria")}
          className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 font-inter text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          aria-label={
            notificationCount > 0
              ? t("studentTopbar.notificationsWithCount", {
                  count: notificationCount,
                })
              : t("studentTopbar.notifications")
          }
        >
          <Bell className="size-4" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-coral px-1 text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          aria-label={t("studentTopbar.help")}
        >
          <HelpCircle className="size-4" />
        </button>
      </div>
    </header>
  );
}
