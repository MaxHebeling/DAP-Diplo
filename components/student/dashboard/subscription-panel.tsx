import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DapButton } from "@/components/ui-dap/button";
import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";

/**
 * Panel inferior del dashboard: recursos (comunidad/en vivo/tutor) +
 * estado de suscripción (próximo cobro o fecha de cancelación) +
 * promo del tutor IA.
 */
export async function SubscriptionPanel({
  cancelDate,
  nextBillDate,
  isAdmin,
}: {
  cancelDate: string | null;
  nextBillDate: string | null;
  isAdmin: boolean;
}) {
  const t = await getTranslations("Student");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.resources.title")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.resources.description")}
          </DapCardDescription>
        </DapCardHeader>
        <ul className="mt-4 space-y-3 font-inter text-sm">
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/comunidad"
              className="text-text-primary hover:text-brand-coral"
            >
              {t("dashboard.resources.community")}
            </Link>
          </li>
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/en-vivo"
              className="text-text-primary hover:text-brand-coral"
            >
              {t("dashboard.resources.live")}
            </Link>
          </li>
          <li className="flex items-center gap-3">
            <ArrowRight className="size-3.5 text-brand-coral" />
            <Link
              href="/tutor"
              className="text-text-primary hover:text-brand-coral"
            >
              {t("dashboard.resources.tutor")}
            </Link>
          </li>
          {isAdmin && (
            <li className="flex items-center gap-3">
              <ArrowRight className="size-3.5 text-brand-violet" />
              <Link
                href="/admin"
                className="text-text-primary hover:text-brand-violet"
              >
                {t("dashboard.resources.admin")}
              </Link>
            </li>
          )}
        </ul>
      </DapCard>

      <aside className="space-y-4">
        <DapCard>
          <h3 className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
            {t("dashboard.subscription.label")}
          </h3>
          <p className="mt-2 font-grotesk text-h4 font-semibold text-text-primary">
            {t("dashboard.subscription.active")}
          </p>
          <p className="mt-1 font-inter text-xs text-text-secondary">
            {cancelDate
              ? t("dashboard.subscription.cancelsOn", { date: cancelDate })
              : nextBillDate
                ? t("dashboard.subscription.nextBill", { date: nextBillDate })
                : "—"}
          </p>
          <form action="/api/billing/portal" method="POST" className="mt-4">
            <DapButton
              type="submit"
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {t("dashboard.subscription.manage")}
            </DapButton>
          </form>
        </DapCard>

        <div className="relative overflow-hidden rounded-xl border border-brand-violet/20 bg-brand-violet/[0.04] p-5">
          <Sparkles
            className="mb-2 size-5 text-brand-coral"
            strokeWidth={1.8}
          />
          <p className="font-grotesk text-sm font-semibold text-text-primary">
            {t("dashboard.tutorPromo.title")}
          </p>
          <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
            {t("dashboard.tutorPromo.description")}
          </p>
          <DapButton
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start px-0"
            render={<Link href="/tutor" />}
          >
            {t("dashboard.tutorPromo.open")}
            <ArrowRight />
          </DapButton>
        </div>
      </aside>
    </div>
  );
}
