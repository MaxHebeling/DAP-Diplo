import { CalendarClock, ExternalLink, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/module/markdown";
import { LIVE_KIND_LABEL, type LiveKind } from "@/lib/live-sessions/schemas";
import { formatLocalDateTime, liveStatus } from "@/lib/live-sessions/format";
import type { StudentSession } from "@/lib/live-sessions/types";

const KIND_BADGE_COLOR: Record<LiveKind, string> = {
  masterclass: "bg-brand-coral/15 text-brand-coral border-brand-coral/30",
  activation: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  mentorship: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  special: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

export function UpcomingSessionCard({ session }: { session: StudentSession }) {
  const status = liveStatus(session.scheduled_at, session.duration_minutes);
  const isLiveNow = status === "live" || status === "soon";

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b bg-muted/10 px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          <span className="capitalize">
            {formatLocalDateTime(session.scheduled_at)}
          </span>
          <span className="text-border">·</span>
          <span>{session.duration_minutes} min</span>
        </div>
        {isLiveNow && (
          <Badge className="bg-red-500 text-white animate-pulse">
            <Radio className="size-3" strokeWidth={3} />
            En vivo ahora
          </Badge>
        )}
      </div>

      <div className="px-6 py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`font-normal ${KIND_BADGE_COLOR[session.kind]}`}
          >
            {LIVE_KIND_LABEL[session.kind]}
          </Badge>
          {session.block && (
            <Badge variant="secondary" className="font-normal">
              Bloque {String(session.block.order_index).padStart(2, "0")}:{" "}
              {session.block.title}
            </Badge>
          )}
        </div>

        <h2 className="font-serif text-xl font-semibold leading-tight">
          {session.title}
        </h2>

        {session.host_name && (
          <p className="mt-2 text-sm text-muted-foreground">
            Imparte: <span className="text-foreground">{session.host_name}</span>
          </p>
        )}

        {session.description && (
          <div className="mt-4 prose prose-sm prose-neutral max-w-none dark:prose-invert">
            <Markdown>{session.description}</Markdown>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Button
            size={isLiveNow ? "default" : "sm"}
            variant={isLiveNow ? "default" : "outline"}
            render={
              <a
                href={session.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ExternalLink className="size-4" />
            {isLiveNow ? "Unirme ahora" : "Abrir sala"}
          </Button>
        </div>
      </div>
    </article>
  );
}
