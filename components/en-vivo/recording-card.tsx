"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CalendarClock, ExternalLink, Play, X } from "lucide-react";

// Lazy: el player solo se monta cuando el alumno abre la grabación.
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
});
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LIVE_KIND_LABEL, type LiveKind } from "@/lib/live-sessions/schemas";
import {
  formatLocalDateShort,
} from "@/lib/live-sessions/format";
import type { StudentSession } from "@/lib/live-sessions/types";

const KIND_BADGE_COLOR: Record<LiveKind, string> = {
  masterclass: "bg-brand-coral/15 text-brand-coral border-brand-coral/30",
  activation: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  mentorship: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  special: "bg-purple-500/15 text-purple-600 border-purple-500/30",
};

export function RecordingCard({ session }: { session: StudentSession }) {
  const [open, setOpen] = useState(false);
  const hasMux = !!session.recording_mux_playback_id;
  const hasExternal = !!session.recording_url;

  return (
    <>
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/10 px-5 py-2.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          <span>{formatLocalDateShort(session.scheduled_at)}</span>
          <span className="text-border">·</span>
          <span>{session.duration_minutes} min</span>
        </div>

        <div className="flex flex-1 flex-col px-5 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`font-normal ${KIND_BADGE_COLOR[session.kind]}`}
            >
              {LIVE_KIND_LABEL[session.kind]}
            </Badge>
            {session.phase && (
              <Badge variant="secondary" className="font-normal">
                Fase {String(session.phase.order_index).padStart(2, "0")}
              </Badge>
            )}
          </div>

          <h2 className="mb-2 font-serif text-lg font-semibold leading-snug">
            {session.title}
          </h2>

          {session.host_name && (
            <p className="text-xs text-muted-foreground">
              {session.host_name}
            </p>
          )}

          <div className="mt-auto pt-4">
            {hasMux ? (
              <Button size="sm" onClick={() => setOpen(true)} className="w-full">
                <Play className="size-3.5" />
                Ver grabación
              </Button>
            ) : hasExternal ? (
              <Button
                size="sm"
                className="w-full"
                render={
                  <a
                    href={session.recording_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="size-3.5" />
                Ver grabación
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="w-full">
                Grabación no disponible
              </Button>
            )}
          </div>
        </div>
      </article>

      {open && hasMux && (
        <RecordingModal
          title={session.title}
          playbackId={session.recording_mux_playback_id!}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function RecordingModal({
  title,
  playbackId,
  onClose,
}: {
  title: string;
  playbackId: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
          <h3 className="truncate font-medium text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </header>
        <MuxPlayer
          playbackId={playbackId}
          metadata={{ video_title: title }}
          accentColor="#fdad5a"
          style={{ aspectRatio: "16/9", width: "100%", display: "phase" }}
        />
      </div>
    </div>
  );
}
