"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";

import { cn } from "@/lib/utils";
import { DapAvatar } from "@/components/ui-dap/avatar";
import { DapButton } from "@/components/ui-dap/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = { href: string; label: string };

export type DapHeaderUser = {
  fullName: string | null;
  avatarUrl: string | null;
  role: "student" | "admin";
} | null;

type DapPublicHeaderProps = {
  links?: NavLink[];
  ctaLabel?: string;
  ctaHref?: string;
  loginLabel?: string;
  loginHref?: string;
  user?: DapHeaderUser;
  onSignOut?: () => void | Promise<void>;
};

// Default cross-página: rutas absolutas + anchor a la sección de
// preguntas del landing. Si una página quiere su propio menú (ej. el
// landing usa anchors a #bloques), pasa `links={[...]}` explícito.
const DEFAULT_LINKS: NavLink[] = [
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/rangos", label: "Dimensiones" },
  { href: "/precios", label: "Precios" },
  { href: "/demo", label: "Demo gratis" },
  { href: "/#faq", label: "Preguntas" },
];

export function DapPublicHeader({
  links = DEFAULT_LINKS,
  ctaLabel = "Empezar ahora",
  ctaHref = "/suscribirme",
  loginLabel = "Iniciar sesión",
  loginHref = "/login",
  user,
  onSignOut,
}: DapPublicHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll progress (0..1) suavizado con spring para que no se vea jittery.
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  return (
    <header
      data-slot="dap-public-header"
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.08] bg-surface-base/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      {/* Scroll progress bar — gradient violet→coral, 2px, top del header */}
      <motion.div
        aria-hidden
        style={{ scaleX }}
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-brand-violet via-brand-coral to-brand-violet"
      />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href="/"
          className="flex items-center text-text-primary"
          aria-label="DAP — Inicio"
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

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 font-inter text-sm font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Mobile: avatar es un link directo (evita bugs Radix
                  DropdownMenu en Safari iOS standalone PWA) */}
              <Link
                href="/dashboard"
                aria-label="Ir a mi dashboard"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base sm:hidden"
              >
                <DapAvatar
                  src={user.avatarUrl}
                  name={user.fullName}
                  size="sm"
                />
              </Link>

              {/* Desktop: dropdown completo con Admin + Cerrar sesión */}
              <div className="hidden sm:inline-flex">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Abrir menú de cuenta"
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
                  >
                    <DapAvatar
                      src={user.avatarUrl}
                      name={user.fullName}
                      size="sm"
                    />
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
                    {onSignOut && (
                      <>
                        <DropdownMenuSeparator />
                        <form action={onSignOut}>
                          <DropdownMenuItem
                            render={<button type="submit" className="w-full" />}
                          >
                            <LogOut className="size-4" />
                            Cerrar sesión
                          </DropdownMenuItem>
                        </form>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              <Link
                href={loginHref}
                className="hidden font-inter text-sm font-medium text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
              >
                {loginLabel}
              </Link>
              <DapButton
                render={<Link href={ctaHref} />}
                size="sm"
                className="hidden sm:inline-flex"
              >
                {ctaLabel}
              </DapButton>
            </>
          )}

          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.08] bg-surface-base/95 backdrop-blur-xl md:hidden">
          <nav
            className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4"
            aria-label="Móvil"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 font-inter text-base text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:hidden">
                <Link
                  href={loginHref}
                  className="rounded-md px-3 py-2 font-inter text-base text-text-secondary"
                >
                  {loginLabel}
                </Link>
                <DapButton render={<Link href={ctaHref} />} size="md">
                  {ctaLabel}
                </DapButton>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
