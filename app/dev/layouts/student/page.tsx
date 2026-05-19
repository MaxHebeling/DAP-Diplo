import { BookOpen, GraduationCap, Users } from "lucide-react";

import { DapButton } from "@/components/ui-dap/button";
import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { DapModuleCard } from "@/components/ui-dap/module-card";
import { DapProgressBar } from "@/components/ui-dap/progress-bar";
import { DapRankBadge } from "@/components/ui-dap/rank-badge";
import { DapStat } from "@/components/ui-dap/stat";
import { DapStudentSidebar } from "@/components/layouts/dap-student-sidebar";
import { DapStudentTopbar } from "@/components/layouts/dap-student-topbar";

export const metadata = { title: "DAP — Student layout preview (dev)" };

export default function StudentLayoutDevPage() {
  return (
    <div className="flex min-h-screen bg-surface-base font-inter text-text-primary">
      <DapStudentSidebar
        userName="Max Hebeling"
        userEmail="pastor@iglesia.org"
        rank={{ order: 3, label: "Líder" }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DapStudentTopbar title="Inicio" notificationCount={3} />

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-5xl space-y-8">
            {/* Hero */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
                  Mes 5 · Bloque 3
                </p>
                <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight">
                  Buen día, Max
                </h1>
                <p className="mt-2 text-text-secondary">
                  Tienes 8 de 11 módulos aprobados este mes. ¡Sigue!
                </p>
              </div>
              <DapRankBadge rankOrder={3} size="xl" label="Líder" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DapCard>
                <DapStat icon={BookOpen} value="8 / 11" label="Módulos aprobados (mes)" />
              </DapCard>
              <DapCard>
                <DapStat icon={GraduationCap} value="Mes 5" label="Tu progreso" accent="coral" />
              </DapCard>
              <DapCard>
                <DapStat icon={Users} value="120+" label="Compañeros activos" accent="amber" />
              </DapCard>
            </div>

            {/* Progress */}
            <DapCard>
              <DapCardHeader>
                <DapCardTitle>Tu recorrido</DapCardTitle>
                <DapCardDescription>5 de 18 meses académicos</DapCardDescription>
              </DapCardHeader>
              <DapProgressBar value={28} label="Diplomado" />
            </DapCard>

            {/* Modules */}
            <DapCard className="p-2">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="font-grotesk text-h4 font-semibold">
                  Próximos módulos
                </h2>
                <DapButton variant="ghost" size="sm">
                  Ver todos
                </DapButton>
              </div>
              <div className="mt-2">
                <DapModuleCard
                  moduleNumber={9}
                  title="Discipulado multigeneracional"
                  blockName="Bloque 3 · Liderazgo y Discipulado"
                  state="available"
                  href="#"
                />
                <DapModuleCard
                  moduleNumber={10}
                  title="El equipo apostólico"
                  blockName="Bloque 3 · Liderazgo y Discipulado"
                  state="available"
                  href="#"
                />
                <DapModuleCard
                  moduleNumber={11}
                  title="Sucesión y multiplicación"
                  blockName="Bloque 3 · Liderazgo y Discipulado"
                  state="locked"
                />
              </div>
            </DapCard>
          </div>
        </main>
      </div>
    </div>
  );
}
