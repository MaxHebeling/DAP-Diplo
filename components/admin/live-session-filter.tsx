"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS: { key: "upcoming" | "past" | "all"; label: string }[] = [
  { key: "upcoming", label: "Próximas" },
  { key: "past", label: "Pasadas" },
  { key: "all", label: "Todas" },
];

export function LiveSessionFilter({
  current,
}: {
  current: "upcoming" | "past" | "all";
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "upcoming" ? "/admin/en-vivo" : `/admin/en-vivo?when=${t.key}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === t.key
              ? "bg-brand-coral text-brand-coral-foreground"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
