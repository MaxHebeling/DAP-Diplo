"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import {
  Award,
  BookOpen,
  Calendar,
  Compass,
  GraduationCap,
  Home,
  LogOut,
  MessageCircle,
  Radio,
  Settings,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { DapAvatar } from "@/components/ui-dap/avatar";
import { DapNavItem } from "@/components/ui-dap/nav-item";
import { DapRankBadge, type RankOrder } from "@/components/ui-dap/rank-badge";

type NavGroup = {
  title?: string;
  items: { href: string; icon: LucideIcon; label: string; badge?: React.ReactNode }[];
};

type DapStudentSidebarProps = {
  userName: string;
  userEmail?: string;
  userAvatar?: string | null;
  rank?: { order: RankOrder; label: string } | null;
  groups?: NavGroup[];
  className?: string;
  onSignOut?: () => void | Promise<void>;
};

export function DapStudentSidebar({
  userName,
  userEmail,
  userAvatar,
  rank,
  groups,
  className,
  onSignOut,
}: DapStudentSidebarProps) {
  const t = useTranslations("Shell");
  const pathname = usePathname();

  const defaultGroups: NavGroup[] = [
    {
      items: [
        { href: "/dashboard", icon: Home, label: t("studentSidebar.navHome") },
        {
          href: "/fases",
          icon: BookOpen,
          label: t("studentSidebar.navModules"),
        },
        {
          href: "/progreso",
          icon: GraduationCap,
          label: t("studentSidebar.navProgress"),
        },
      ],
    },
    {
      title: t("studentSidebar.groupCommunity"),
      items: [
        {
          href: "/comunidad",
          icon: MessageCircle,
          label: t("studentSidebar.navCommunity"),
        },
        { href: "/en-vivo", icon: Radio, label: t("studentSidebar.navLive") },
        { href: "/tutor", icon: Sparkles, label: t("studentSidebar.navTutor") },
      ],
    },
    {
      title: t("studentSidebar.groupAccount"),
      items: [
        {
          href: "/certificaciones",
          icon: Award,
          label: t("studentSidebar.navCertifications"),
        },
        {
          href: "/agenda",
          icon: Calendar,
          label: t("studentSidebar.navAgenda"),
        },
        {
          href: "/configuracion",
          icon: Settings,
          label: t("studentSidebar.navSettings"),
        },
      ],
    },
  ];
  const resolvedGroups = groups ?? defaultGroups;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      data-slot="dap-student-sidebar"
      className={cn(
        "flex h-screen w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-surface-base text-text-primary",
        className,
      )}
      aria-label={t("studentSidebar.studentNav")}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2"
          aria-label={t("studentSidebar.logoHomeAria")}
        >
          <Image
            src="/dap-logo-white.png"
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-md"
            priority
          />
          <span className="font-grotesk text-lg font-bold tracking-tight">
            DAP
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {resolvedGroups.map((group, idx) => (
          <div key={idx} className={cn(idx > 0 && "mt-6")}>
            {group.title && (
              <p className="mb-2 px-4 font-grotesk text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                {group.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <DapNavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  badge={item.badge}
                  active={isActive(item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
          {rank ? (
            <DapRankBadge rankOrder={rank.order} size="sm" label={rank.label} />
          ) : (
            <DapAvatar src={userAvatar ?? undefined} name={userName} size="sm" />
          )}
          <div className="min-w-0">
            <p className="truncate font-inter text-sm font-medium text-text-primary">
              {userName}
            </p>
            <p className="truncate font-inter text-xs text-text-secondary">
              {rank?.label ?? userEmail ?? t("studentSidebar.studentFallback")}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Link
            href="/configuracion"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 font-inter text-xs text-text-tertiary transition-colors hover:text-text-primary"
          >
            <Compass className="size-3.5" />
            {t("studentSidebar.myJourney")}
          </Link>
          {onSignOut && (
            <form action={onSignOut}>
              <button
                type="submit"
                aria-label={t("studentSidebar.signOut")}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-inter text-xs text-text-tertiary transition-colors hover:text-brand-coral"
              >
                <LogOut className="size-3.5" />
                {t("studentSidebar.exit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
