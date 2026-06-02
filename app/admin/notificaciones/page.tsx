import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BroadcastForm } from "./broadcast-form";

export const metadata = { title: "Notificaciones push · Admin DAP" };
export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const supabase = await createClient();

  // Conteos por audiencia (para mostrar cuántos van a recibir).
  const [{ count: activeUsers }, { count: pendingUsers }, { count: pushSubs }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("user_id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
      supabase
        .from("subscriptions")
        .select("user_id", { count: "exact", head: true })
        .in("status", ["pending", "paused", "past_due"]),
      supabase
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true }),
    ]);

  return (
    <main className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-1 inline-flex items-center gap-1.5 font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
          <Bell className="size-3" /> Broadcast
        </p>
        <h1 className="font-grotesk text-3xl font-bold text-foreground">
          Notificaciones push
        </h1>
        <p className="mt-1 font-inter text-sm text-muted-foreground">
          Mandá una notificación a los alumnos suscritos. Llega como banner del
          PWA (móvil + desktop) si tienen permiso de notificaciones activo.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Suscriptos activos" value={activeUsers ?? 0} accent="violet" />
        <Kpi
          label="Pendientes / pausados"
          value={pendingUsers ?? 0}
          accent="coral"
        />
        <Kpi
          label="Dispositivos registrados"
          value={pushSubs ?? 0}
          accent="emerald"
        />
      </div>

      <BroadcastForm
        activeUsers={activeUsers ?? 0}
        pendingUsers={pendingUsers ?? 0}
      />
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "violet" | "coral" | "emerald";
}) {
  const accentCls =
    accent === "violet"
      ? "border-brand-violet/30 bg-brand-violet/[0.06] text-brand-violet"
      : accent === "coral"
        ? "border-brand-coral/30 bg-brand-coral/[0.06] text-brand-coral"
        : "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400";
  return (
    <div className={`rounded-xl border p-4 ${accentCls}`}>
      <p className="font-inter text-xs uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-1 font-grotesk text-3xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
