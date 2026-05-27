"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { locales, LOCALE_COOKIE, type Locale } from "@/i18n/config";

// La escritura de cookie vive a nivel de módulo (no dentro del componente)
// para no disparar la regla react-hooks/immutability del React Compiler.
function persistLocaleCookie(locale: Locale) {
  // 1 año de persistencia. samesite=lax para que sobreviva navegaciones.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Selector de idioma ES / EN.
 *
 * Modo "sin i18n routing": no cambia la URL. Escribe la cookie NEXT_LOCALE
 * y refresca el árbol de Server Components (router.refresh()), que vuelve a
 * leer la cookie en i18n/request.ts y re-renderiza con el idioma elegido.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const active = useLocale();
  const t = useTranslations("LanguageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === active) return;
    persistLocaleCookie(next);
    startTransition(() => router.refresh());
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
