import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Compass,
  Cpu,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function DapPublicFooter() {
  const t = await getTranslations("Footer");

  const VALUES = [
    { icon: BookOpen, label: t("values.biblical") },
    { icon: Briefcase, label: t("values.practical") },
    { icon: Compass, label: t("values.strategic") },
    { icon: Cpu, label: t("values.technological") },
    { icon: Sparkles, label: t("values.apostolic") },
  ];

  const COLS = [
    {
      title: t("cols.support.title"),
      links: [
        { href: "/#faq", label: t("cols.support.faq") },
        { href: "/login", label: t("cols.support.login") },
        { href: "/contacto", label: t("cols.support.contact") },
      ],
    },
    {
      title: t("cols.legal.title"),
      links: [
        { href: "/terminos", label: t("cols.legal.terms") },
        { href: "/privacidad", label: t("cols.legal.privacy") },
        { href: "/reembolso", label: t("cols.legal.refunds") },
      ],
    },
  ];

  return (
    <footer
      data-slot="dap-public-footer"
      className="border-t border-white/[0.08] bg-surface-base text-text-primary"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div className="space-y-6">
            <Link
              href="/"
              className="inline-flex items-center"
              aria-label={t("home")}
            >
              <Image
                src="/dap-logo-white.png"
                alt="DAP"
                width={36}
                height={36}
                className="size-9 rounded-md"
              />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
              {t("tagline")}
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 font-grotesk text-sm font-semibold uppercase tracking-widest text-text-tertiary">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-inter text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Respaldo oficial — Revival & Kingdom Ministries */}
          <div>
            <p className="mb-4 font-grotesk text-sm font-semibold uppercase tracking-widest text-text-tertiary">
              {t("backing.title")}
            </p>
            <div className="flex items-start gap-3">
              <Image
                src="/rkm-seal.png"
                alt="Revival & Kingdom Ministries"
                width={56}
                height={56}
                className="size-14 shrink-0 opacity-90"
              />
              <p className="font-inter text-xs leading-relaxed text-text-secondary">
                {t.rich("backing.description", {
                  org: (chunks) => (
                    <span className="font-semibold text-text-primary">
                      {chunks}
                    </span>
                  ),
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Pilares del DAP — alineados debajo de las columnas, full-width */}
        <ul className="mt-12 flex flex-wrap justify-center gap-2 border-t border-white/[0.06] pt-8 sm:gap-3">
          {VALUES.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-text-secondary"
            >
              <Icon
                className="size-3.5 text-brand-violet"
                strokeWidth={2}
              />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-2 pt-6 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t("legalBar.copyright", { year: new Date().getFullYear() })}{" "}
            <span className="text-text-tertiary/60">|</span>{" "}
            {t("legalBar.developedBy")}{" "}
            <a
              href="https://www.ikingdom.org"
              target="_blank"
              rel="noopener noreferrer"
              className="gradient-text font-semibold transition-opacity hover:opacity-80"
            >
              iKingdom
            </a>
          </p>
          <p>
            {t("legalBar.builtWithPurpose")} ·{" "}
            <span className="gradient-text font-semibold">
              {t("legalBar.apostolicTech")}
            </span>
          </p>
        </div>
      </div>

      {/* Marquee slogan band — última franja del footer */}
      <div
        aria-label={t("marquee")}
        className="overflow-hidden border-t border-white/[0.06] bg-surface-elevated/40 py-5"
      >
        <div className="dap-marquee flex w-max items-center gap-12 whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-12 font-grotesk text-sm font-semibold uppercase tracking-[0.32em] text-text-secondary"
              aria-hidden={i > 0}
            >
              {t("marquee")}
              <span className="gradient-text text-lg">✦</span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
