import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { CalendarClock, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { UpcomingSessionCard } from "@/components/en-vivo/upcoming-session-card";
import { RecordingCard } from "@/components/en-vivo/recording-card";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import { requireActiveSubscription } from "@/lib/subscription/gate";
import type { StudentSession } from "@/lib/live-sessions/types";
import { cn } from "@/lib/utils";
import { MS_PER_HOUR } from "@/lib/constants/time";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("live.metaTitle") };
}

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function StudentEnVivoPage({ searchParams }: PageProps) {
  await requireActiveSubscription("/en-vivo");
  const t = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;
  const { tab: tabParam } = await searchParams;
  const tab: "upcoming" | "recordings" =
    tabParam === "recordings" ? "recordings" : "upcoming";

  const supabase = await createClient();
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const windowStartIso = new Date(nowMs - 4 * MS_PER_HOUR).toISOString();

  // "Próximas" incluye: futuras + actualmente en vivo (within duration window).
  // Para simplificarlo y aprovechar el index por scheduled_at: traemos las que
  // todavía no han pasado en MÁS de 4h (cubre las en vivo largas) y filtramos
  // en JS por si acaso.
  const upcomingPromise = supabase
    .from("live_sessions")
    .select(
      `id, kind, title, description, scheduled_at, duration_minutes,
       meeting_url, host_name, recording_url, recording_mux_playback_id,
       phase:phases!live_sessions_phase_id_fkey(order_index, title, title_en)`,
    )
    .gte("scheduled_at", windowStartIso)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  // Grabaciones: sesiones pasadas CON recording (url o mux).
  const recordingsPromise = supabase
    .from("live_sessions")
    .select(
      `id, kind, title, description, scheduled_at, duration_minutes,
       meeting_url, host_name, recording_url, recording_mux_playback_id,
       phase:phases!live_sessions_phase_id_fkey(order_index, title, title_en)`,
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

  // Reemplaza phase.title por su versión localizada antes de pasar a los
  // cards (client components). El resto del objeto queda igual.
  type RawSession = Omit<StudentSession, "phase"> & {
    phase: { order_index: number; title: string; title_en: string | null } | null;
  };
  const localizePhase = (s: RawSession): StudentSession => ({
    ...s,
    phase: s.phase
      ? {
          order_index: s.phase.order_index,
          title: localized(s.phase, "title", locale) ?? s.phase.title,
        }
      : null,
  });

  // Filtrar las que ya cerraron su ventana (scheduled_at + duration <= ahora)
  const upcoming = ((upcomingRaw ?? []) as unknown as RawSession[])
    .map(localizePhase)
    .filter((s) => {
      const end =
        new Date(s.scheduled_at).getTime() + s.duration_minutes * 60_000;
      return end > nowMs;
    });
  const recordingsList = (
    (recordings ?? []) as unknown as RawSession[]
  ).map(localizePhase);

  const counts = {
    upcoming: upcoming.length,
    recordings: recordingsList.length,
  };

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("live.eyebrow")}
          </p>
          <h1 className="font-serif text-3xl font-semibold">
            {t("live.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("live.subtitle")}
          </p>
        </header>

        {/* Tabs */}
        <div className="mb-6 inline-flex items-center gap-1 rounded-lg border bg-card p-1">
          <TabLink
            href="/en-vivo"
            active={tab === "upcoming"}
            icon={<CalendarClock className="size-3.5" />}
            label={t("live.tabUpcoming")}
            count={counts.upcoming}
          />
          <TabLink
            href="/en-vivo?tab=recordings"
            active={tab === "recordings"}
            icon={<Film className="size-3.5" />}
            label={t("live.tabRecordings")}
            count={counts.recordings}
          />
        </div>

        {tab === "upcoming" ? (
          upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="size-8 text-muted-foreground/40" />}
              title={t("live.emptyUpcoming.title")}
              description={t("live.emptyUpcoming.description")}
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
            title={t("live.emptyRecordings.title")}
            description={t("live.emptyRecordings.description")}
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

