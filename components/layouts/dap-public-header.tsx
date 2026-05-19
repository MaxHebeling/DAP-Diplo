"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DapButton } from "@/components/ui-dap/button";

type NavLink = { href: string; label: string };

type DapPublicHeaderProps = {
  links?: NavLink[];
  ctaLabel?: string;
  ctaHref?: string;
  loginLabel?: string;
  loginHref?: string;
};

const DEFAULT_LINKS: NavLink[] = [
  { href: "#bloques", label: "Bloques" },
  { href: "#modelo", label: "Modelo" },
  { href: "#testimonios", label: "Testimonios" },
  { href: "#preguntas", label: "Preguntas" },
];

export function DapPublicHeader({
  links = DEFAULT_LINKS,
  ctaLabel = "Empezar ahora",
  ctaHref = "/suscribirme",
  loginLabel = "Iniciar sesión",
  loginHref = "/login",
}: DapPublicHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-text-primary"
          aria-label="DAP — Inicio"
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
          </nav>
        </div>
      )}
    </header>
  );
}
