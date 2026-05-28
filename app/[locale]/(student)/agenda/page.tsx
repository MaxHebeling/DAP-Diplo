import { Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/student/coming-soon-page";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("agenda.metaTitle") };
}

export default async function AgendaPage() {
  const t = await getTranslations("Student");
  return (
    <ComingSoonPage
      topbarTitle={t("agenda.topbarTitle")}
      eyebrow={t("agenda.eyebrow")}
      title={t("agenda.title")}
      description={t("agenda.description")}
      icon={Calendar}
      primaryAction={{ href: "/en-vivo", label: t("agenda.primaryAction") }}
      secondaryActions={[
        { href: "/dashboard", label: t("agenda.secondaryAction") },
      ]}
    />
  );
}
