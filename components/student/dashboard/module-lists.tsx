import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import {
  estimateWeekOpensAt,
  formatDapLongDate,
  type WeekStatus,
} from "@/lib/calendar/week";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import type { ModuleRow } from "@/lib/student/dashboard-data";

/**
 * Lista de módulos pasados (6 más recientes antes de la semana actual)
 * con badge "completado" o link a "revisar". Vacío en la primera semana.
 */
export async function PastModulesList({
  locale,
  modules,
  progressById,
}: {
  locale: Locale;
  modules: ModuleRow[];
  progressById: Map<string, boolean>;
}) {
  const t = await getTranslations("Student");
  if (modules.length === 0) {
    return (
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.past.title")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.past.emptyDescription")}
          </DapCardDescription>
        </DapCardHeader>
      </DapCard>
    );
  }
  return (
    <DapCard>
      <DapCardHeader>
        <DapCardTitle>{t("dashboard.past.titleFull")}</DapCardTitle>
        <DapCardDescription>
          {t("dashboard.past.description")}
        </DapCardDescription>
      </DapCardHeader>
      <ul className="mt-4 space-y-2">
        {modules.map((m) => (
          <ModuleListItem
            key={m.id}
            locale={locale}
            module={m}
            status="review"
            isCompleted={progressById.get(m.id) === true}
          />
        ))}
      </ul>
    </DapCard>
  );
}

/**
 * Lista de los 3 próximos módulos (locked). Muestra cuándo abre cada
 * uno según el calendario personal del alumno.
 */
export async function UpcomingModulesList({
  locale,
  modules,
  programStartDate,
}: {
  locale: Locale;
  modules: ModuleRow[];
  programStartDate: string | null;
}) {
  const t = await getTranslations("Student");
  if (modules.length === 0) {
    return (
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.upcoming.title")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.upcoming.emptyDescription")}
          </DapCardDescription>
        </DapCardHeader>
      </DapCard>
    );
  }
  return (
    <DapCard>
      <DapCardHeader>
        <DapCardTitle>{t("dashboard.upcoming.titleFull")}</DapCardTitle>
        <DapCardDescription>
          {t("dashboard.upcoming.description")}
        </DapCardDescription>
      </DapCardHeader>
      <ul className="mt-4 space-y-2">
        {modules.map((m) => {
          const opensAt = estimateWeekOpensAt(programStartDate, m.course_week);
          return (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-grotesk text-sm font-medium text-text-primary">
                  {t("dashboard.listItem.weekTitle", {
                    week: m.course_week,
                    title: localized(m, "title", locale) ?? m.title,
                  })}
                </p>
                {opensAt && (
                  <p className="font-inter text-xs text-text-tertiary">
                    {t("dashboard.upcoming.opensAt", {
                      date: formatDapLongDate(opensAt),
                    })}
                  </p>
                )}
              </div>
              <Lock className="size-3.5 shrink-0 text-text-tertiary" />
            </li>
          );
        })}
      </ul>
    </DapCard>
  );
}

async function ModuleListItem({
  locale,
  module,
  status,
  isCompleted,
}: {
  locale: Locale;
  module: ModuleRow;
  status: WeekStatus;
  isCompleted: boolean;
}) {
  const t = await getTranslations("Student");
  const href = module.block
    ? `/fases/${module.block.slug}/modulos/${module.slug}`
    : "/fases";
  const moduleTitle = localized(module, "title", locale) ?? module.title;
  const blockTitle = module.block
    ? localized(module.block, "title", locale) ?? module.block.title
    : null;
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 hover:border-white/[0.12] hover:bg-white/[0.04]"
      >
        <div className="min-w-0">
          <p className="truncate font-grotesk text-sm font-medium text-text-primary">
            {t("dashboard.listItem.weekTitle", {
              week: module.course_week,
              title: moduleTitle,
            })}
          </p>
          {module.block && (
            <p className="truncate font-inter text-xs text-text-tertiary">
              {blockTitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="size-4 text-emerald-400" />
          ) : status === "review" ? (
            <span className="font-inter text-xs text-text-tertiary">
              {t("dashboard.listItem.review")}
            </span>
          ) : null}
          <ArrowRight className="size-3.5 text-text-tertiary group-hover:text-brand-coral" />
        </div>
      </Link>
    </li>
  );
}
