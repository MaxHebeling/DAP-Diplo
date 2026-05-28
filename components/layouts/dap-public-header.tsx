"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { DapAvatar } from "@/components/ui-dap/avatar";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";
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

export function DapPublicHeader({
  links,
  ctaLabel,
  ctaHref = "/suscribirme",
  loginLabel,
  loginHref = "/login",
  user,
  onSignOut,
}: DapPublicHeaderProps) {
  const t = useTranslations("Header");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Default cross-página: rutas absolutas + anchor a preguntas. Si una
  // página pasa `links={[...]}` explícito, usa ese menú. Etiquetas e
  // íconos textuales salen de next-intl (cambian con el idioma).
  const navLinks: NavLink[] =
    links ?? [
      { href: "/como-funciona", label: t("comoFunciona") },
      { href: "/rangos", label: t("dimensiones") },
      { href: "/precios", label: t("precios") },
      { href: "/demo", label: t("demoGratis") },
      { href: "/#faq", label: t("preguntas") },
    ];
  const ctaText = ctaLabel ?? t("cta");
  const loginText = loginLabel ?? t("login");

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
          aria-label={t("home")}
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
          {navLinks.map((link) => (
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
          {/* Selector de idioma: visible en desktop; en móvil va dentro
              del menú desplegable de abajo. */}
          <LanguageSwitcher className="hidden md:inline-flex" />

          {user ? (
            <>
              {/* Mobile: avatar es un link directo (evita bugs Radix
                  DropdownMenu en Safari iOS standalone PWA) */}
              <Link
                href="/dashboard"
                aria-label={t("goToDashboard")}
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
                    aria-label={t("accountMenu")}
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
                      {user.fullName ?? t("account")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem render={<Link href="/dashboard" />}>
                        <LayoutDashboard className="size-4" />
                        {t("dashboard")}
                      </DropdownMenuItem>
                      {user.role === "admin" && (
                        <DropdownMenuItem render={<Link href="/admin" />}>
                          <ShieldCheck className="size-4" />
                          {t("admin")}
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
                            {t("signOut")}
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
                {loginText}
              </Link>
              <span className="hidden sm:inline-flex">
                <EnrollmentCTA href={ctaHref} size="sm">
                  {ctaText}
                </EnrollmentCTA>
              </span>
            </>
          )}

          <button
            type="button"
            aria-label={open ? t("closeMenu") : t("openMenu")}
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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 font-inter text-base text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}

            {/* Selector de idioma (versión móvil) */}
            <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] px-3 pt-3">
              <span className="font-inter text-sm text-text-secondary">
                {t("language")}
              </span>
              <LanguageSwitcher />
            </div>

            {!user && (
              <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] pt-3 sm:hidden">
                <Link
                  href={loginHref}
                  className="rounded-md px-3 py-2 font-inter text-base text-text-secondary"
                >
                  {loginText}
                </Link>
                <EnrollmentCTA href={ctaHref} size="md">
                  {ctaText}
                </EnrollmentCTA>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
