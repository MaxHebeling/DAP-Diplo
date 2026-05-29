"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, LOCALE_COOKIE, type Locale } from "@/i18n/config";

function persistLocaleCookie(locale: Locale) {
  // 1 año, samesite=lax. Necesario para que el cron de email + SSR fresh
  // request lean el idioma elegido aunque la URL no lleve prefijo.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Selector de idioma ES / EN.
 *
 * Modo `localePrefix: "as-needed"`: para que el cambio se aplique el server
 * tiene que recibir un request con el segmento /en (o sin segmento para es).
 * Solo escribir la cookie y hacer router.refresh() NO cambia nada — el
 * server ignora la cookie y mira la URL.
 *
 * El fix: router.replace(pathname, {locale}) — next-intl reescribe la URL
 * preservando el path actual y el query, agregando o quitando /en según
 * corresponda. Además persistimos la cookie para que próximas SSR fresh
 * (links de email, deep-links) respeten el idioma.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const active = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === active) return;
    persistLocaleCookie(next);
    startTransition(() => {
      // Pasa los dynamic params del segmento actual para que las rutas
      // [slug]/[moduleSlug] etc. no se rompan al cambiar de locale.
      router.replace(
        // @ts-expect-error params son `Record<string, string|string[]>`
        { pathname, params },
        { locale: next },
      );
    });
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5",
        isPending && "opacity-60",
        className,
      )}
    >
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          aria-pressed={active === loc}
          disabled={isPending}
          className={cn(
            "rounded-full px-2.5 py-1 font-inter text-xs font-semibold uppercase tracking-wide transition-colors",
            active === loc
              ? "bg-white/10 text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
