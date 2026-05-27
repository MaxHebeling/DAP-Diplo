"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TAB_KEYS = ["upcoming", "past", "all"] as const;

export function LiveSessionFilter({
  current,
}: {
  current: "upcoming" | "past" | "all";
}) {
  const t = useTranslations("AdminUI");
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
      {TAB_KEYS.map((key) => (
        <Link
          key={key}
          href={key === "upcoming" ? "/admin/en-vivo" : `/admin/en-vivo?when=${key}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === key
              ? "bg-brand-coral text-brand-coral-foreground"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          {t(`liveFilter.${key}`)}
        </Link>
      ))}
    </div>
  );
}
