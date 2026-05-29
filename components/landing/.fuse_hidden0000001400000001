"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";
import { EnrollmentGateDialog } from "@/components/launch/enrollment-gate-dialog";
import { isEnrollmentOpen } from "@/lib/launch/config";

export type HeaderUser = {
  fullName: string | null;
  avatarUrl: string | null;
  role: "student" | "admin";
} | null;

function initialsOf(name: string | null): string {
  if (!name) return "DAP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function SiteHeader({ user }: { user: HeaderUser }) {
  const t = useTranslations("Landing");
  const [scrolled, setScrolled] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const enrollmentOpen = isEnrollmentOpen();

  const NAV_ITEMS = [
    { href: "/#diplomado", label: t("header.navDiplomado") },
    { href: "/#fases", label: t("header.navFases") },
    { href: "/#dimensiones", label: t("header.navDimensiones") },
    { href: "/#faq", label: t("header.navPreguntas") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-neutral-950/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo size="sm" variant="light" priority />

        <nav className="hidden items-center gap-9 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-neutral-300 transition-colors hover:text-neutral-50"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t("header.accountMenuAria")}
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-coral/60"
              >
                <Avatar className="size-9 border border-white/10">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.fullName ?? ""} />
                  )}
                  <AvatarFallback className="bg-neutral-800 text-xs text-neutral-100">
                    {initialsOf(user.fullName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {user.fullName ?? t("header.myAccount")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    <LayoutDashboard className="size-4" />
                    {t("header.dashboard")}
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem render={<Link href="/admin" />}>
                      <ShieldCheck className="size-4" />
                      {t("header.admin")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem
                    render={<button type="submit" className="w-full" />}
                  >
                    <LogOut className="size-4" />
                    {t("header.signOut")}
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-neutral-200 hover:bg-white/5 hover:text-neutral-50"
                render={<Link href="/login" />}
              >
                {t("header.login")}
              </Button>
              {enrollmentOpen ? (
                <Button
                  size="sm"
                  className="bg-brand-coral text-brand-coral-foreground hover:bg-brand-coral/90"
                  render={<Link href="/signup" />}
                >
                  {t("header.enroll")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-brand-coral text-brand-coral-foreground hover:bg-brand-coral/90"
                  onClick={() => setGateOpen(true)}
                >
                  {t("header.enroll")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <EnrollmentGateDialog open={gateOpen} onOpenChange={setGateOpen} />
    </header>
  );
}
