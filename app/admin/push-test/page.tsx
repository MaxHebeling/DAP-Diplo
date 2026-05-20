import { Bell } from "lucide-react";
import { PushTestForm } from "./push-test-form";

export const metadata = {
  title: "Test de push — Admin DAP",
};

export default function PushTestPage() {
  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-coral/30 bg-brand-coral/[0.06] px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            <Bell className="size-3" />
            Admin · Tooling
          </p>
          <h1 className="font-grotesk text-3xl font-bold tracking-tight">
            Test de push notification
          </h1>
          <p className="font-inter text-sm text-text-secondary">
            Manda una notificación push a un alumno específico. Útil para
            probar el flow end-to-end sin esperar al cron semanal.
          </p>
        </header>

        <PushTestForm />

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-text-tertiary">
          <p className="font-medium text-text-secondary">Notas</p>
          <ul className="mt-2 space-y-1">
            <li>· El alumno debe haber activado notificaciones desde /configuracion antes.</li>
            <li>· Si tiene varios dispositivos suscritos (laptop + celular), recibe en todos.</li>
            <li>· Suscripciones expiradas (browser desinstaló la app) se limpian solas.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
