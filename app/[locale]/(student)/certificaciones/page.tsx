import { Award } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ComingSoonPage } from "@/components/student/coming-soon-page";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("certifications.metaTitle") };
}

export default async function CertificacionesPage() {
  const t = await getTranslations("Student");
  return (
    <ComingSoonPage
      topbarTitle={t("certifications.topbarTitle")}
      eyebrow={t("certifications.eyebrow")}
      title={t("certifications.title")}
      description={t("certifications.description")}
      icon={Award}
      primaryAction={{ href: "/progreso", label: t("certifications.primaryAction") }}
      secondaryActions={[
        { href: "/dashboard", label: t("certifications.secondaryAction") },
      ]}
    />
  );
}
