import { Settings } from "lucide-react";
import { ComingSoonPage } from "@/components/student/coming-soon-page";

export const metadata = { title: "Configuración — DAP" };

export default async function ConfiguracionPage() {
  return (
    <ComingSoonPage
      topbarTitle="Configuración"
      eyebrow="Próximamente"
      title="Configuración de tu cuenta"
      description="Vas a poder editar tu perfil, cambiar tu contraseña, gestionar tu suscripción y preferencias de notificación. Por ahora podés cambiar tu contraseña desde el flow de recuperación, y gestionar la suscripción desde Inicio."
      icon={Settings}
      primaryAction={{ href: "/reset-password", label: "Cambiar contraseña" }}
      secondaryActions={[
        { href: "/dashboard", label: "Volver al inicio" },
      ]}
    />
  );
}
