"use client";

import { useTranslations } from "next-intl";

import { Tour, type TourStep } from "./tour";

export function DashboardTour() {
  const t = useTranslations("Onboarding.dashboardTour");

  const steps: TourStep[] = [
    {
      title: t("welcomeTitle"),
      body: t("welcomeBody"),
      placement: "center",
    },
    {
      target: '[data-tour="current-module"]',
      title: t("currentModuleTitle"),
      body: t("currentModuleBody"),
      placement: "bottom",
    },
    {
      target: '[data-tour="progress"]',
      title: t("progressTitle"),
      body: t("progressBody"),
      placement: "bottom",
    },
    {
      target: '[data-tour="upcoming"]',
      title: t("upcomingTitle"),
      body: t("upcomingBody"),
      placement: "top",
    },
    {
      target: '[data-tour="resources"]',
      title: t("resourcesTitle"),
      body: t("resourcesBody"),
      placement: "top",
    },
  ];

  return <Tour steps={steps} />;
}
