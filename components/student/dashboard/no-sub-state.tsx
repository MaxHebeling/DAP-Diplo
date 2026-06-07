import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { EnrollmentCTA } from "@/components/launch/enrollment-cta";

/**
 * Estado del dashboard cuando el alumno no tiene suscripción activa
 * (nunca se suscribió o canceló). Le muestra CTA al checkout.
 */
export async function NoSubscriptionState({
  firstName,
  hadCanceledSub,
}: {
  firstName: string;
  hadCanceledSub: boolean;
}) {
  const t = await getTranslations("Student");
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
          {t("common.diplomaEyebrow")}
        </p>
        <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
          {t("dashboard.greeting", { firstName })}
        </h1>
        <p className="mt-3 font-inter text-base leading-relaxed text-text-secondary">
          {hadCanceledSub
            ? t("dashboard.noSub.canceled")
            : t("dashboard.noSub.inactive")}
        </p>
      </header>

      <DapCard>
        <DapCardHeader>
          <DapCardTitle>{t("dashboard.noSub.cardTitle")}</DapCardTitle>
          <DapCardDescription>
            {t("dashboard.noSub.cardDescription")}
          </DapCardDescription>
        </DapCardHeader>
        <div className="mt-4">
          <EnrollmentCTA href="/suscribirme" size="lg">
            {t("dashboard.noSub.cta")}
            <ArrowRight />
          </EnrollmentCTA>
        </div>
      </DapCard>
    </div>
  );
}
