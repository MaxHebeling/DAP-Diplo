"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";

/**
 * Error boundary global de App Router. Atrapa cualquier error no
 * manejado en client/server components fuera de un boundary más
 * específico. Reporta a Sentry y muestra una UI mínima cinematográfica
 * acorde a la identidad DAP.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPages");

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: "app-root" },
    });
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#04081A] px-6 py-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_50%_30%,rgba(123,97,255,0.20),transparent_70%),radial-gradient(45%_40%_at_50%_75%,rgba(255,77,109,0.15),transparent_70%)]"
      />

      <div className="flex size-16 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
        <AlertTriangle className="size-8" strokeWidth={1.6} />
      </div>

      <p className="mt-6 font-inter text-[10px] font-semibold uppercase tracking-[0.42em] text-brand-coral">
        {t("error.eyebrow")}
      </p>
      <h1 className="mt-3 max-w-xl font-grotesk text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
        {t("error.title")}
      </h1>
      <p className="mt-4 max-w-md font-inter text-sm leading-relaxed text-text-secondary">
        {t("error.body")}
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-violet to-brand-coral px-6 py-3 font-inter text-sm font-semibold text-white shadow-lg shadow-brand-coral/25 transition-all hover:shadow-xl hover:shadow-brand-coral/40"
        >
          <RotateCw className="size-4" strokeWidth={2} />
          {t("error.retry")}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-6 py-3 font-inter text-sm font-medium text-text-secondary backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-text-primary"
        >
          <Home className="size-4" strokeWidth={2} />
          {t("error.backHome")}
        </Link>
      </div>

      {error.digest && (
        <p className="mt-10 font-inter text-[10px] uppercase tracking-[0.32em] text-text-tertiary">
          {t("error.ref", { digest: error.digest })}
        </p>
      )}
    </main>
  );
}
