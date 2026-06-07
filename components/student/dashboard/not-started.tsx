import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DapCard } from "@/components/ui-dap/card";
import { formatDapLongDate } from "@/lib/calendar/week";

/**
 * Estado del dashboard cuando el alumno tiene sub activa pero su
 * program_start_date todavía no llegó (admin sin date, o aspirante
 * recién aprobado esperando el martes que arranca).
 */
export async function NotStartedYet({
  firstName,
  programStartDate,
  matricula,
  isAdmin,
}: {
  firstName: string;
  programStartDate: string | null;
  matricula: string | null;
  isAdmin: boolean;
}) {
  const t = await getTranslations("Student");
  const startsAt = programStartDate
    ? formatDapLongDate(new Date(`${programStartDate}T12:00:00`))
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
          {t("common.diplomaEyebrow")}
        </p>
        <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
          {t("dashboard.welcome", { firstName })}
        </h1>
        {isAdmin && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-0.5 font-inter text-xs font-medium text-brand-violet">
            {t("dashboard.admin")}
          </p>
        )}
      </header>

      <DapCard>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
            <CalendarClock className="size-6" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-grotesk text-h4 font-semibold text-text-primary">
              {t("dashboard.notStarted.cardTitle")}
            </h2>
            {startsAt ? (
              <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
                {t.rich("dashboard.notStarted.startsOn", {
                  startsAt,
                  strong: (chunks) => (
                    <span className="font-semibold text-text-primary">
                      {chunks}
                    </span>
                  ),
                })}
              </p>
            ) : (
              <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
                {t("dashboard.notStarted.noDate")}
              </p>
            )}
            {matricula && (
              <p className="mt-3 font-mono text-xs text-text-tertiary">
                {t("dashboard.notStarted.matricula", { matricula })}
              </p>
            )}
          </div>
        </div>
      </DapCard>

      <p className="font-inter text-xs text-text-tertiary">
        {t.rich("dashboard.notStarted.explore", {
          community: (chunks) => (
            <Link href="/comunidad" className="text-brand-coral hover:underline">
              {chunks}
            </Link>
          ),
          tutor: (chunks) => (
            <Link href="/tutor" className="text-brand-coral hover:underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
