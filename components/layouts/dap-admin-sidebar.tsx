"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  Layers,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type DapAdminSidebarProps = {
  items?: AdminNavItem[];
  className?: string;
};

const DEFAULT_ITEMS: AdminNavItem[] = [
  { href: "/admin", icon: BarChart3, label: "Dashboard" },
  { href: "/admin/fases", icon: Layers, label: "Bloques" },
  { href: "/admin/modulos", icon: BookOpen, label: "Módulos" },
  { href: "/admin/alumnos", icon: Users, label: "Alumnos" },
  { href: "/admin/suscripciones", icon: ShieldCheck, label: "Suscripciones" },
  { href: "/admin/en-vivo", icon: Calendar, label: "En vivo" },
  { href: "/admin/comunidad", icon: MessageSquare, label: "Comunidad" },
  { href: "/admin/tutor", icon: Brain, label: "Tutor IA" },
  { href: "/admin/configuracion", icon: Settings, label: "Configuración" },
];

export function DapAdminSidebar({
  items = DEFAULT_ITEMS,
  className,
}: DapAdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      data-slot="dap-admin-sidebar"
      className={cn(
        "flex h-screen w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-surface-elevated text-text-primary",
        className,
      )}
      aria-label="Navegación de admin"
    >
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2"
          aria-label="DAP Admin"
        >
          <Image
            src="/dap-logo-white.png"
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-md"
            priority
          />
          <div className="flex flex-col leading-none">
            <span className="font-grotesk text-base font-bold tracking-tight">
              DAP
            </span>
            <span className="font-inter text-[10px] uppercase tracking-widest text-text-tertiary">
              Admin
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 font-inter text-sm font-medium transition-colors",
                  active
                    ? "bg-white/[0.06] text-text-primary"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.8} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <p className="font-inter text-[10px] uppercase tracking-widest text-text-tertiary">
          Backoffice
        </p>
        <p className="mt-0.5 font-inter text-xs text-text-secondary">
          Cambios en producción · cuidado.
        </p>
      </div>
    </aside>
  );
}
