import Link from "next/link";
import { CalendarClock, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpcomingSessionCard } from "@/components/en-vivo/upcoming-session-card";
import { RecordingCard } from "@/components/en-vivo/recording-card";
import { createClient } from "@/lib/supabase/server";
import { requireActiveSubscription } from "@/lib/subscription/gate";
import type { StudentSession } from "@/lib/live-sessions/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "En vivo — DAP" };

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function StudentEnVivoPage({ searchParams }: PageProps) {
  await requireActiveSubscription("/en-vivo");
  const { tab: tabParam } = await searchParams;
  const tab: "upcoming" | "recordings" =
    tabParam === "recordings" ? "recordings" : "upcoming";

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // "Próximas" incluye: futuras + actualmente en vivo (within duration window).
  // Para simplificarlo y aprovechar el index por scheduled_at: traemos las que
  // todavía no han pasado en MÁS de 4h (cubre las en vivo largas) y filtramos
  // en JS por si acaso.
  const upcomingPromise = supabase
    .from("live_sessions")
    .select(
      `id, kind, title, description, scheduled_at, duration_minutes,
       meeting_url, host_name, recording_url, recording_mux_playback_id,
       phase:phases!live_sessions_phase_id_fkey(order_index, title)`,
    )
    .gte(
      "scheduled_at",
      new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    )
    .order("scheduled_at", { ascending: true })
    .limit(50);

  // Grabaciones: sesiones pasadas CON recording (url o mux).
  const recordingsPromise = supabase
    .from("live_sessions")
    .select(
      `id, kind, title, description, scheduled_at, duration_minutes,
       meeting_url, host_name, recording_url, recording_mux_playback_id,
       phase:phases!live_sessions_phase_id_fkey(order_index, title)`,
    )
    .lt("scheduled_at", nowIso)
    .or("recording_url.not.is.null,recording_mux_playback_id.not.is.null")
    .order("scheduled_at", { ascending: false })
    .limit(100);

  const [
    { data: upcomingRaw, error: uErr },
    { data: recordings, error: rErr },
  ] = await Promise.all([upcomingPromise, recordingsPromise]);

  if (uErr) throw new Error(`No se pudieron cargar próximas: ${uErr.message}`);
  if (rErr) throw new Error(`No se pudieron cargar grabaciones: ${rErr.message}`);

  // Filtrar las que ya cerraron su ventana (scheduled_at + duration <= ahora)
  const now = Date.now();
  const upcoming = ((upcomingRaw ?? []) as unknown as StudentSession[]).filter(
    (s) => {
      const end =
        new Date(s.scheduled_at).getTime() + s.duration_minutes * 60_000;
      return end > now;
    },
  );
  const recordingsList = (recordings ?? []) as unknown as StudentSession[];

  const counts = {
    upcoming: upcoming.length,
    recordings: recordingsList.length,
  };

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            En vivo
          </p>
          <h1 className="font-serif text-3xl font-semibold">
            Sesiones del DAP
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            MasterClass, activaciones y mentorías grupales. Las grabaciones
            quedan disponibles después de cada sesión.
          </p>
        </header>

        {/* Tabs */}
        <div className="mb-6 inline-flex items-center gap-1 rounded-lg border bg-card p-1">
          <TabLink
            href="/en-vivo"
            active={tab === "upcoming"}
            icon={<CalendarClock className="size-3.5" />}
            label="Próximas"
            count={counts.upcoming}
          />
          <TabLink
            href="/en-vivo?tab=recordings"
            active={tab === "recordings"}
            icon={<Film className="size-3.5" />}
            label="Grabaciones"
            count={counts.recordings}
          />
        </div>

        {tab === "upcoming" ? (
          upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="size-8 text-muted-foreground/40" />}
              title="No hay sesiones programadas"
              description="El equipo aún no ha agendado próximas sesiones. Mientras tanto, explora las grabaciones disponibles."
            />
          ) : (
            <ul className="space-y-4">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <UpcomingSessionCard session={s} />
                </li>
              ))}
            </ul>
          )
        ) : recordingsList.length === 0 ? (
          <EmptyState
            icon={<Film className="size-8 text-muted-foreground/40" />}
            title="Aún no hay grabaciones"
            description="Las grabaciones aparecen aquí después de cada sesión en vivo."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {recordingsList.map((s) => (
              <li key={s.id}>
                <RecordingCard session={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function TabLink({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-brand-coral text-brand-coral-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {icon}
      {label}
      <Badge
        variant={active ? "secondary" : "outline"}
        className="ml-1 h-4 px-1.5 text-[10px] font-medium"
      >
        {count}
      </Badge>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/10 px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
        {description}
      </p>
    </div>
  );
}

