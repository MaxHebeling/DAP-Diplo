import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DapButton } from "@/components/ui-dap/button";
import { formatDapDateTime } from "@/lib/calendar/week";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import type { ModuleRow } from "@/lib/student/dashboard-data";

/**
 * Card destacado de "tu módulo de esta semana" en el dashboard. Muestra
 * título + subtítulo + bloque + countdown hasta el cierre de la tarea
 * (si no completado) o badge "ya completaste este módulo".
 */
export async function CurrentWeekCard({
  locale,
  module,
  isCompleted,
  closesAt,
}: {
  locale: Locale;
  module: ModuleRow;
  isCompleted: boolean;
  closesAt: Date | null;
}) {
  const t = await getTranslations("Student");
  const moduleTitle = localized(module, "title", locale) ?? module.title;
  const moduleSubtitle = localized(module, "subtitle", locale);
  const blockTitle = module.block
    ? localized(module.block, "title", locale) ?? module.block.title
    : null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-coral/25 bg-gradient-to-br from-brand-violet/[0.10] via-surface-elevated to-brand-coral/[0.06] p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-coral/10 blur-3xl"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("dashboard.currentCard.eyebrow", { week: module.course_week })}
          </p>
          <h2 className="mt-2 font-grotesk text-h2 font-bold leading-tight text-text-primary">
            {moduleTitle}
          </h2>
          {moduleSubtitle && (
            <p className="mt-1 font-inter text-sm text-text-secondary">
              {moduleSubtitle}
            </p>
          )}
          {module.block && (
            <p className="mt-3 font-inter text-xs text-text-tertiary">
              {t("dashboard.currentCard.block", {
                order: String(module.block.order_index).padStart(2, "0"),
                title: blockTitle ?? module.block.title,
              })}
            </p>
          )}
          {closesAt && !isCompleted && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2.5 py-1 font-inter text-xs text-text-secondary">
              <Clock className="size-3.5 text-brand-coral" />
              {t("dashboard.currentCard.taskCloses", {
                date: formatDapDateTime(closesAt),
              })}
            </p>
          )}
          {isCompleted && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 font-inter text-xs text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              {t("dashboard.currentCard.completed")}
            </p>
          )}
        </div>
        <DapButton
          render={
            <Link
              href={
                module.block
                  ? `/fases/${module.block.slug}/modulos/${module.slug}`
                  : `/fases`
              }
            />
          }
          size="lg"
        >
          {isCompleted ? t("common.review") : t("common.continue")}
          <ArrowRight />
        </DapButton>
      </div>
    </div>
  );
}
