"use client";

import { useEffect, useRef } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { Download, FileText, Headphones, Link as LinkIcon } from "lucide-react";
import { AdvanceButton } from "@/components/module/advance-button";
import { Markdown } from "@/components/module/markdown";
import { saveLastPosition } from "@/lib/progress/actions";

type Resource = {
  id: string;
  title: string;
  kind: "pdf" | "audio" | "link" | "slides" | "other";
  url: string;
};

type SectionTeachingProps = {
  sectionId: string;
  moduleId: string;
  blockSlug: string;
  moduleSlug: string;
  muxPlaybackId: string | null;
  bodyMd: string | null;
  durationSeconds: number | null;
  startPositionSeconds: number;
  resources: Resource[];
};

const RESOURCE_ICON: Record<Resource["kind"], typeof FileText> = {
  pdf: FileText,
  audio: Headphones,
  link: LinkIcon,
  slides: FileText,
  other: FileText,
};

export function SectionTeaching(props: SectionTeachingProps) {
  const lastSavedRef = useRef<number>(0);
  const lastKnownPositionRef = useRef<number>(props.startPositionSeconds);

  // Guarda last_position cada 10s + al unmount.
  useEffect(() => {
    return () => {
      const pos = Math.round(lastKnownPositionRef.current);
      if (pos > 0 && pos !== Math.round(lastSavedRef.current)) {
        // Fire-and-forget (la ruta puede haber cambiado pero queremos persistir).
        void saveLastPosition({
          sectionId: props.sectionId,
          lastPositionSeconds: pos,
        });
      }
    };
  }, [props.sectionId]);

  function handleTimeUpdate(e: Event) {
    const player = e.target as HTMLMediaElement & { currentTime: number };
    const t = Math.round(player.currentTime ?? 0);
    lastKnownPositionRef.current = t;
    if (t - Math.round(lastSavedRef.current) >= 10) {
      lastSavedRef.current = t;
      void saveLastPosition({
        sectionId: props.sectionId,
        lastPositionSeconds: t,
        watchedSeconds: t,
      });
    }
  }

  return (
    <div className="space-y-8">
      {props.muxPlaybackId ? (
        <div className="overflow-hidden rounded-xl border bg-black">
          <MuxPlayer
            streamType="on-demand"
            playbackId={props.muxPlaybackId}
            startTime={props.startPositionSeconds}
            metadata={{
              video_id: props.sectionId,
              video_title: "Enseñanza",
            }}
            onTimeUpdate={handleTimeUpdate}
            style={{ aspectRatio: "16 / 9", width: "100%" }}
            accentColor="#fdad5a"
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
          Video pendiente de subir (sin mux_playback_id en esta sección).
        </div>
      )}

      {props.bodyMd && <Markdown>{props.bodyMd}</Markdown>}

      {props.resources.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Recursos descargables
          </h3>
          <ul className="divide-y rounded-lg border bg-card">
            {props.resources.map((r) => {
              const Icon = RESOURCE_ICON[r.kind];
              return (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="size-4 text-brand-coral" strokeWidth={1.7} />
                      {r.title}
                    </span>
                    <Download className="size-4 text-muted-foreground" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="pt-2">
        <AdvanceButton
          sectionId={props.sectionId}
          moduleId={props.moduleId}
          blockSlug={props.blockSlug}
          moduleSlug={props.moduleSlug}
          nextSection="activation"
          label="Marcar como visto y continuar"
        />
      </div>
    </div>
  );
}
