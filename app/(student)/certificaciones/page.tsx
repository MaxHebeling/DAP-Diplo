import { Award } from "lucide-react";
import { ComingSoonPage } from "@/components/student/coming-soon-page";

export const metadata = { title: "Certificaciones — DAP" };

export default async function CertificacionesPage() {
  return (
    <ComingSoonPage
      topbarTitle="Certificaciones"
      eyebrow="Próximamente"
      title="Tus certificados"
      description="Acá vas a poder descargar todos tus certificados y compartir tus dimensiones obtenidas. Por ahora puedes ver tu progreso y las dimensiones ganadas desde Mi Progreso."
      icon={Award}
      primaryAction={{ href: "/progreso", label: "Ver mi progreso" }}
      secondaryActions={[
        { href: "/dashboard", label: "Volver al inicio" },
      ]}
    />
  );
}
