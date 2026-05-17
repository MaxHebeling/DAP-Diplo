"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export type HeaderUser = {
  fullName: string | null;
  avatarUrl: string | null;
  role: "student" | "admin";
} | null;

const NAV_ITEMS = [
  { href: "#diplomado", label: "El Diplomado" },
  { href: "#bloques", label: "Bloques" },
  { href: "#rangos", label: "Rangos" },
  { href: "#faq", label: "Preguntas" },
];

function initialsOf(name: string | null): string {
  if (!name) return "DAP";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function SiteHeader({ user }: { user: HeaderUser }) {
  const [scrolled, setScrolled] = useState(false);

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
        <Logo size="sm" priority />

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
                aria-label="Abrir menú de cuenta"
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
                  {user.fullName ?? "Mi cuenta"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link href="/dashboard" />}>
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </DropdownMenuItem>
                  {user.role === "admin" && (
                    <DropdownMenuItem render={<Link href="/admin" />}>
                      <ShieldCheck className="size-4" />
                      Admin
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem
                    render={<button type="submit" className="w-full" />}
                  >
                    <LogOut className="size-4" />
                    Cerrar sesión
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
                Iniciar sesión
              </Button>
              <Button
                size="sm"
                className="bg-brand-navy text-brand-navy-foreground hover:bg-brand-navy/90"
                render={<Link href="/signup" />}
              >
                Inscribirme
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
