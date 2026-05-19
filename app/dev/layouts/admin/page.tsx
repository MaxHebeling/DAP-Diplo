import { ArrowRight, Calendar, Layers, Users } from "lucide-react";

import { DapButton } from "@/components/ui-dap/button";
import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { DapStat } from "@/components/ui-dap/stat";
import { DapAdminSidebar } from "@/components/layouts/dap-admin-sidebar";

export const metadata = { title: "DAP — Admin layout preview (dev)" };

export default function AdminLayoutDevPage() {
  return (
    <div className="flex min-h-screen bg-surface-base font-inter text-text-primary">
      <DapAdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-surface-base/85 px-6 backdrop-blur-xl">
          <h1 className="font-grotesk text-h4 font-semibold text-text-primary">
            Dashboard admin
          </h1>
          <div className="ml-auto flex items-center gap-2 text-xs text-text-tertiary">
            <span className="hidden sm:inline">Vista prod</span>
            <span className="inline-block size-2 rounded-full bg-emerald-400" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-text-tertiary">
                Backoffice
              </p>
              <h2 className="mt-2 font-grotesk text-h1 font-bold leading-tight">
                Resumen general
              </h2>
              <p className="mt-1 text-text-secondary">
                Cambios afectan producción inmediatamente.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DapCard>
                <DapStat icon={Users} value="1,247" label="Alumnos activos" />
              </DapCard>
              <DapCard>
                <DapStat icon={Layers} value="200" label="Módulos publicados" accent="coral" />
              </DapCard>
              <DapCard>
                <DapStat icon={Calendar} value="32" label="Sesiones en vivo (mes)" accent="amber" />
              </DapCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DapCard>
                <DapCardHeader>
                  <DapCardTitle>Próximas acciones</DapCardTitle>
                  <DapCardDescription>Pendientes que requieren tu atención.</DapCardDescription>
                </DapCardHeader>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li>· Subir grabación de MasterClass del 15-may</li>
                  <li>· Revisar 3 sugerencias del Tutor IA</li>
                  <li>· Aprobar 2 nuevos posts en la comunidad</li>
                </ul>
                <DapButton variant="ghost" size="sm" className="mt-4">
                  Ver bandeja <ArrowRight />
                </DapButton>
              </DapCard>

              <DapCard>
                <DapCardHeader>
                  <DapCardTitle>Suscripciones</DapCardTitle>
                  <DapCardDescription>Estado del cobro este mes.</DapCardDescription>
                </DapCardHeader>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li>· 1,247 activas</li>
                  <li>· 89 en pausa académica</li>
                  <li>· 12 con cobro fallido</li>
                </ul>
                <DapButton variant="secondary" size="sm" className="mt-4">
                  Ver detalle
                </DapButton>
              </DapCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
