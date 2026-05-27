"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  Calendar,
  Compass,
  GraduationCap,
  Home,
  LogOut,
  MessageCircle,
  Menu,
  Radio,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { DapAvatar } from "@/components/ui-dap/avatar";
import { DapNavItem } from "@/components/ui-dap/nav-item";
import {
  DapRankBadge,
  type RankOrder,
} from "@/components/ui-dap/rank-badge";
import { EsdrasFloatingBubble } from "@/components/tutor/esdras-floating-bubble";

type NavGroup = {
  title?: string;
  items: {
    href: string;
    icon: LucideIcon;
    label: string;
    badge?: React.ReactNode;
  }[];
};

export type DapStudentShellProps = {
  userName: string;
  userEmail?: string;
  userAvatar?: string | null;
  rank?: { order: RankOrder; label: string } | null;
  title?: string;
  onSignOut?: () => void | Promise<void>;
  children: React.ReactNode;
};

/**
 * Shell mobile-first del área del alumno.
 * - lg+: sidebar fijo izquierda + topbar arriba + main
 * - <lg: drawer overlay (controlado por hamburger en topbar) + bottom nav fija
 *
 * Cerrá el drawer automáticamente al navegar (pathname change).
 */
export function DapStudentShell({
  userName,
  userEmail,
  userAvatar,
  rank,
  title,
  onSignOut,
  children,
}: DapStudentShellProps) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      items: [
        { href: "/dashboard", icon: Home, label: t("studentShell.navHome") },
        { href: "/fases", icon: BookOpen, label: t("studentShell.navModules") },
        {
          href: "/progreso",
          icon: GraduationCap,
          label: t("studentShell.navProgress"),
        },
      ],
    },
    {
      title: t("studentShell.groupCommunity"),
      items: [
        {
          href: "/comunidad",
          icon: MessageCircle,
          label: t("studentShell.navCommunity"),
        },
        { href: "/en-vivo", icon: Radio, label: t("studentShell.navLive") },
        { href: "/tutor", icon: Sparkles, label: t("studentShell.navTutor") },
      ],
    },
    {
      title: t("studentShell.groupAccount"),
      items: [
        {
          href: "/certificaciones",
          icon: Award,
          label: t("studentShell.navCertifications"),
        },
        { href: "/agenda", icon: Calendar, label: t("studentShell.navAgenda") },
        {
          href: "/configuracion",
          icon: Settings,
          label: t("studentShell.navSettings"),
        },
      ],
    },
  ];

  // Bottom nav (mobile-only): los 4 destinos más usados.
  const bottomNav = [
    { href: "/dashboard", icon: Home, label: t("studentShell.bottomNavHome") },
    { href: "/fases", icon: BookOpen, label: t("studentShell.bottomNavModules") },
    {
      href: "/comunidad",
      icon: MessageCircle,
      label: t("studentShell.bottomNavCommunity"),
    },
    {
      href: "/configuracion",
      icon: Settings,
      label: t("studentShell.bottomNavAccount"),
    },
  ];

  // Cerrar drawer al cambiar de página. React 19 strict marca esto como
  // anti-pattern, pero las alternativas (key reset, ref render-phase
  // setState, useSyncExternalStore) son peores para este caso de "UI
  // que reacciona a un cambio externo (navegación) que no es derivable".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
  }, [pathname]);

  // Lock scroll body cuando drawer está abierto en mobile
  useEffect(() => {
    if (drawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [drawerOpen]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex min-h-screen bg-surface-base text-text-primary">
      {/* SIDEBAR DESKTOP (lg+) */}
      <aside
        className="hidden h-screen w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-surface-base lg:sticky lg:top-0 lg:flex"
        aria-label={t("studentShell.studentNav")}
      >
        <SidebarContent
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          rank={rank}
          isActive={isActive}
          onSignOut={onSignOut}
          groups={navGroups}
        />
      </aside>

      {/* DRAWER MOBILE (<lg) */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <button
            type="button"
            aria-label={t("studentShell.closeMenu")}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
          {/* Panel */}
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/[0.08] bg-surface-base shadow-2xl lg:hidden"
            aria-label={t("studentShell.studentNav")}
          >
            <SidebarContent
              userName={userName}
              userEmail={userEmail}
              userAvatar={userAvatar}
              rank={rank}
              isActive={isActive}
              onSignOut={onSignOut}
              groups={navGroups}
              showClose
              onClose={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      {/* MAIN COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DapStudentTopbarInline
          title={title}
          onOpenMenu={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* BOTTOM NAV (mobile only) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-white/[0.08] bg-surface-base/95 backdrop-blur-xl lg:hidden"
        aria-label={t("studentShell.quickNav")}
      >
        {bottomNav.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 font-inter text-[10px] font-medium transition-colors",
                active
                  ? "text-brand-coral"
                  : "text-text-tertiary hover:text-text-primary",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform",
                  active && "dap-bounce-active text-brand-coral",
                )}
                strokeWidth={active ? 2.2 : 1.7}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Chat flotante de Esdras — disponible en todas las páginas del
          portal del alumno. Se auto-oculta en /tutor (página dedicada). */}
      <EsdrasFloatingBubble />
    </div>
  );
}

// ---------- Sub-componentes ----------

function SidebarContent({
  userName,
  userEmail,
  userAvatar,
  rank,
  isActive,
  onSignOut,
  groups,
  showClose = false,
  onClose,
}: {
  userName: string;
  userEmail?: string;
  userAvatar?: string | null;
  rank?: { order: RankOrder; label: string } | null;
  isActive: (href: string) => boolean;
  onSignOut?: () => void | Promise<void>;
  groups: NavGroup[];
  showClose?: boolean;
  onClose?: () => void;
}) {
  const t = useTranslations("Shell");
  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between gap-2 border-b border-white/[0.06] px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2"
          aria-label={t("studentShell.logoHomeAria")}
        >
          <Image
            src="/dap-logo-white.png"
            alt="DAP"
            width={32}
            height={32}
            className="size-8 rounded-md"
            priority
          />
        </Link>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("studentShell.closeMenu")}
            className="inline-flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group, idx) => (
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

      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
          {rank ? (
            <DapRankBadge
              rankOrder={rank.order}
              size="sm"
              label={rank.label}
            />
          ) : (
            <DapAvatar
              src={userAvatar ?? undefined}
              name={userName}
              size="sm"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-inter text-sm font-medium text-text-primary">
              {userName}
            </p>
            <p className="truncate font-inter text-xs text-text-secondary">
              {rank?.label ?? userEmail ?? t("studentShell.studentFallback")}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Link
            href="/configuracion"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 font-inter text-xs text-text-tertiary transition-colors hover:text-text-primary"
          >
            <Compass className="size-3.5" />
            {t("studentShell.myJourney")}
          </Link>
          {onSignOut && (
            <form action={onSignOut}>
              <button
                type="submit"
                aria-label={t("studentShell.signOut")}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-inter text-xs text-text-tertiary transition-colors hover:text-brand-coral"
              >
                <LogOut className="size-3.5" />
                {t("studentShell.exit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

function DapStudentTopbarInline({
  title,
  onOpenMenu,
}: {
  title?: string;
  onOpenMenu: () => void;
}) {
  const t = useTranslations("Shell");
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-surface-base/85 px-4 backdrop-blur-xl sm:px-6",
      )}
    >
      {/* Hamburger mobile */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t("studentShell.openMenu")}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {title && (
        <h1 className="truncate font-grotesk text-base font-semibold text-text-primary sm:text-lg lg:text-h4">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* Search hidden on mobile (los items ya están en el drawer/bottom nav) */}
        {/* Placeholder por si después agregamos buscador en desktop */}
      </div>
    </header>
  );
}
