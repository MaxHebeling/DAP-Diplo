import { Calendar } from "lucide-react";
import { ComingSoonPage } from "@/components/student/coming-soon-page";

export const metadata = { title: "Agenda — DAP" };

export default async function AgendaPage() {
  return (
    <ComingSoonPage
      topbarTitle="Agenda"
      eyebrow="Próximamente"
      title="Tu agenda en el DAP"
      description="Acá vas a ver el calendario semanal con tus módulos, MasterClass en vivo y mentorías. Mientras tanto, las sesiones en vivo programadas las ves en En Vivo y tu módulo de la semana en Inicio."
      icon={Calendar}
      primaryAction={{ href: "/en-vivo", label: "Ver sesiones en vivo" }}
      secondaryActions={[
        { href: "/dashboard", label: "Volver al inicio" },
      ]}
    />
  );
}
