"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Brain,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Radio,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/admisiones", label: "Admisiones", icon: GraduationCap, exact: false },
  { href: "/admin/fases", label: "Fases", icon: Layers, exact: false },
  { href: "/admin/comunidad", label: "Comunidad", icon: MessagesSquare, exact: false },
  { href: "/admin/en-vivo", label: "En vivo", icon: Radio, exact: false },
  { href: "/admin/tutor/documentos", label: "Tutor IA", icon: Brain, exact: false },
  { href: "/admin/push-test", label: "Test push", icon: Bell, exact: false },
];

export function AdminSidebar({ fullName }: { fullName: string | null }) {
  const pathname = usePathname() ?? "/admin";

  return (
    <aside className="hidden border-r bg-card/30 lg:flex lg:w-64 lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <Logo size="sm" />
        <span className="text-xs font-medium uppercase tracking-widest text-brand-coral">
          Admin
        </span>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-brand-coral/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-4" strokeWidth={1.7} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4">
        <p className="mb-2 truncate text-xs text-muted-foreground">
          {fullName ?? "Admin"}
        </p>
        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard" />}
          >
            Ir a mi dashboard
          </Button>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
