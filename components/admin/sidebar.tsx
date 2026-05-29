"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Bell,
  Brain,
  FileText,
  Globe2,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  MessagesSquare,
  Radio,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const NAV = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", labelKey: "leads", icon: Mail, exact: false },
  { href: "/admin/visitas", labelKey: "visits", icon: Globe2, exact: false },
  { href: "/admin/admisiones", labelKey: "admissions", icon: GraduationCap, exact: false },
  { href: "/admin/bloques", labelKey: "blocksCopy", icon: Layers, exact: false },
  { href: "/admin/fases", labelKey: "phasesModules", icon: Layers, exact: false },
  { href: "/admin/comunidad", labelKey: "community", icon: MessagesSquare, exact: false },
  { href: "/admin/en-vivo", labelKey: "live", icon: Radio, exact: false },
  { href: "/admin/tutor/documentos", labelKey: "tutorAi", icon: Brain, exact: false },
  { href: "/admin/excorrector", labelKey: "excorrector", icon: Sparkles, exact: false },
  { href: "/admin/brief-pastores", labelKey: "pastorsBrief", icon: FileText, exact: false },
  { href: "/admin/push-test", labelKey: "pushTest", icon: Bell, exact: false },
] as const;

export function AdminSidebar({ fullName }: { fullName: string | null }) {
  const t = useTranslations("AdminUI");
  const pathname = usePathname() ?? "/admin";

  return (
    <aside className="hidden border-r bg-card/30 lg:flex lg:w-64 lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <Logo size="sm" />
        <span className="text-xs font-medium uppercase tracking-widest text-brand-coral">
          {t("sidebar.adminBadge")}
        </span>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {NAV.map(({ href, labelKey, icon: Icon, exact }) => {
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
                  {t(`sidebar.${labelKey}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 flex justify-start">
          <LanguageSwitcher />
        </div>
        <p className="mb-2 truncate text-xs text-muted-foreground">
          {fullName ?? t("sidebar.adminFallback")}
        </p>
        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/dashboard" />}
          >
            {t("sidebar.goToDashboard")}
          </Button>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              {t("sidebar.signOut")}
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
