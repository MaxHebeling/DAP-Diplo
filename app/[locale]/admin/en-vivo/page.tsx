import { Link } from "@/i18n/navigation";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Film,
  Pencil,
  Plus,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import { LiveSessionFilter } from "@/components/admin/live-session-filter";
import { createClient } from "@/lib/supabase/server";
import { LIVE_KIND_LABEL, type LiveKind } from "@/lib/live-sessions/schemas";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("live.metaTitle") };
}

type SessionRow = {
  id: string;
  kind: LiveKind;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  host_name: string | null;
  meeting_url: string;
  recording_url: string | null;
  recording_mux_playback_id: string | null;
  phase: { order_index: number; title: string } | null;
};

type PageProps = {
  searchParams: Promise<{ when?: string; focus?: string }>;
};

function formatLocal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const KIND_BADGE_COLOR: Record<LiveKind, string> = {
  masterclass: "bg-brand-coral/15 text-brand-coral border-brand-coral/30",
  activation: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  mentorship: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  special: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

export default async function AdminEnVivoPage({ searchParams }: PageProps) {
  const t = await getTranslations("Admin");
  const { when, focus } = await searchParams;
  const filter = when === "past" || when === "all" ? when : "upcoming";

  const supabase = await createClient();
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  let query = supabase
    .from("live_sessions")
    .select(
      `id, kind, title, scheduled_at, duration_minutes, host_name,
       meeting_url, recording_url, recording_mux_playback_id,
       phase:phases!live_sessions_phase_id_fkey(order_index, title)`,
    )
    .limit(200);

  if (filter === "upcoming") {
    query = query
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true });
  } else if (filter === "past") {
    query = query
      .lt("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: false });
  } else {
    query = query.order("scheduled_at", { ascending: false });
  }

  const { data, error } = await query.returns<SessionRow[]>();
  if (error) {
    throw new Error(t("live.loadError", { message: error.message }));
  }
  const sessions = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("live.eyebrow")}
            </p>
            <h1 className="font-grotesk text-3xl font-semibold">
              {t("live.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("live.description")}
            </p>
          </div>
          <Button render={<Link href="/admin/en-vivo/nuevo" />}>
            <Plus className="size-4" />
            {t("live.newSession")}
          </Button>
        </header>

        <LiveSessionFilter current={filter} />

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">{t("live.thWhen")}</TableHead>
                <TableHead>{t("live.thSession")}</TableHead>
                <TableHead className="hidden md:table-cell w-32">
                  {t("live.thHost")}
                </TableHead>
                <TableHead className="hidden lg:table-cell w-28 text-center">
                  {t("live.thRecording")}
                </TableHead>
                <TableHead className="w-44 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-muted-foreground py-16"
                  >
                    <Calendar className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                    {filter === "upcoming"
                      ? t("live.emptyUpcoming")
                      : filter === "past"
                        ? t("live.emptyPast")
                        : t("live.emptyAll")}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => {
                  const hasRecording =
                    !!s.recording_url || !!s.recording_mux_playback_id;
                  const isPast =
                    new Date(s.scheduled_at).getTime() < nowMs;
                  return (
                    <TableRow
                      key={s.id}
                      data-focus={focus === s.id ? "true" : undefined}
                      className={
                        focus === s.id
                          ? "bg-brand-coral/5 transition-colors"
                          : ""
                      }
                    >
                      <TableCell className="text-sm">
                        <p className="font-medium">{formatLocal(s.scheduled_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("live.minutes", { count: s.duration_minutes })}
                          {isPast ? t("live.past") : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Radio
                            className="mt-1 size-3.5 shrink-0 text-brand-coral"
                            strokeWidth={2.5}
                          />
                          <div className="min-w-0">
                            <p className="font-medium leading-snug">
                              {s.title}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`font-normal ${KIND_BADGE_COLOR[s.kind]}`}
                              >
                                {LIVE_KIND_LABEL[s.kind]}
                              </Badge>
                              {s.phase && (
                                <Badge variant="secondary" className="font-normal">
                                  {t("live.phase", {
                                    index: String(s.phase.order_index).padStart(2, "0"),
                                  })}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {s.host_name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        {hasRecording ? (
                          <CheckCircle2
                            className="mx-auto size-4 text-emerald-500"
                            aria-label={t("live.withRecording")}
                          />
                        ) : isPast ? (
                          <span className="text-xs text-red-500">{t("live.missing")}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            render={
                              <a
                                href={s.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={t("live.openMeetingRoom")}
                              />
                            }
                          >
                            <ExternalLink className="size-3.5" />
                          </Button>
                          {hasRecording && (
                            <Button
                              size="sm"
                              variant="ghost"
                              render={
                                <a
                                  href={
                                    s.recording_url ??
                                    `https://stream.mux.com/${s.recording_mux_playback_id}.m3u8`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t("live.openRecording")}
                                />
                              }
                            >
                              <Film className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            render={
                              <Link href={`/admin/en-vivo/${s.id}/editar`} />
                            }
                          >
                            <Pencil className="size-3.5" />
                            {t("live.edit")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
