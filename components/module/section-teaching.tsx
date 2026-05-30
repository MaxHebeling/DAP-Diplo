"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Download,
  FileText,
  Link as LinkIcon,
  Lock,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { AdvanceButton } from "@/components/module/advance-button";
import { Markdown } from "@/components/module/markdown";
import { saveLastPosition } from "@/lib/progress/actions";

// Lazy: @mux/mux-player-react pesa ~200KB y solo lo necesitamos cuando
// efectivamente hay video que mostrar. Bundle del módulo se reduce ~200KB.
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
});

type Resource = {
  id: string;
  title: string;
  kind: "pdf" | "audio" | "link" | "slides" | "other";
  url: string;
};

type MuxTokens = {
  playback: string;
  thumbnail: string;
  storyboard: string;
};

type SectionTeachingProps = {
  sectionId: string;
  moduleId: string;
  phaseSlug: string;
  moduleSlug: string;
  muxPlaybackId: string | null;
  muxTokens: MuxTokens | null;
  bodyMd: string | null;
  durationSeconds: number | null;
  startPositionSeconds: number;
  /**
   * Si el alumno ya completó esta sección en una visita previa, el
   * botón "Marcar como visto y continuar" aparece habilitado de entrada
   * (no lo obligamos a re-mirar todo el video).
   */
  alreadyCompleted: boolean;
  resources: Resource[];
};

const RESOURCE_ICON: Record<Resource["kind"], typeof FileText> = {
  pdf: FileText,
  audio: PlayCircle,
  link: LinkIcon,
  slides: FileText,
  other: FileText,
};

// Para considerar "visto" si el evento `ended` no dispara (a veces
// falla por buffering, micro-skips, etc.). 95% es estándar en LMS.
const COMPLETION_THRESHOLD = 0.95;

// Tolerancia para diferenciar seek hacia adelante (skip) de drift normal
// del browser al hacer pause/play.
const FORWARD_SEEK_TOLERANCE_SECONDS = 2;

export function SectionTeaching(props: SectionTeachingProps) {
  const t = useTranslations("Module");
  const lastSavedRef = useRef<number>(0);
  const lastKnownPositionRef = useRef<number>(props.startPositionSeconds);
  // Track del segundo más alto que efectivamente vio. Cualquier seek
  // hacia adelante más allá de esto se bloquea.
  const maxReachedRef = useRef<number>(props.startPositionSeconds);
  const skipBlockedToastRef = useRef<number>(0);

  const [hasFinished, setHasFinished] = useState<boolean>(
    props.alreadyCompleted,
  );
  // Dedup: si dos eventos disparan markFinished en el mismo tick
  // (ej. onEnded + onTimeUpdate cruzando el 95%), el ref nos protege
  // de doble persistencia. El state es solo para reactivar la UI.
  const hasFinishedRef = useRef<boolean>(props.alreadyCompleted);

  // Guarda last_position al unmount (cambio de ruta / cierre de pestaña).
  useEffect(() => {
    return () => {
      const pos = Math.round(lastKnownPositionRef.current);
      if (pos > 0 && pos !== Math.round(lastSavedRef.current)) {
        void saveLastPosition({
          sectionId: props.sectionId,
          lastPositionSeconds: pos,
        });
      }
    };
  }, [props.sectionId]);

  // Marca completado UNA vez y persiste watched_seconds final.
  const markFinished = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setHasFinished(true);
    const finalSeconds = Math.round(maxReachedRef.current);
    void saveLastPosition({
      sectionId: props.sectionId,
      lastPositionSeconds: finalSeconds,
      watchedSeconds: finalSeconds,
    });
  }, [props.sectionId]);

  function handleTimeUpdate(e: Event) {
    const player = e.target as HTMLMediaElement;
    const t = Math.round(player.currentTime ?? 0);
    const duration = player.duration || props.durationSeconds || 0;

    lastKnownPositionRef.current = t;
    if (t > maxReachedRef.current) {
      maxReachedRef.current = t;
    }

    // Fallback de "visto" si el evento `ended` no dispara: 95% del total.
    if (
      !hasFinishedRef.current &&
      duration > 0 &&
      t / duration >= COMPLETION_THRESHOLD
    ) {
      markFinished();
    }

    // Persistencia cada 10s (last_position + watched).
    if (t - Math.round(lastSavedRef.current) >= 10) {
      lastSavedRef.current = t;
      void saveLastPosition({
        sectionId: props.sectionId,
        lastPositionSeconds: t,
        watchedSeconds: Math.round(maxReachedRef.current),
      });
    }
  }

  // Bloquea skip hacia adelante: si el alumno intenta saltar a una
  // parte que aún no vio, lo devolvemos al máximo alcanzado. Permite
  // pausar y rewindear libremente.
  function handleSeeking(e: Event) {
    if (hasFinishedRef.current) return; // ya completó, libre de moverse
    const player = e.target as HTMLMediaElement;
    const target = player.currentTime ?? 0;
    const max = maxReachedRef.current + FORWARD_SEEK_TOLERANCE_SECONDS;
    if (target > max) {
      player.currentTime = maxReachedRef.current;
      // Mostrar toast como máximo una vez cada 3s (evita spam).
      const now = Date.now();
      if (now - skipBlockedToastRef.current > 3000) {
        skipBlockedToastRef.current = now;
        toast.info(t("teaching.skipBlockedToast"));
      }
    }
  }

  function handleEnded() {
    markFinished();
  }

  function handlePlayerError() {
    // Causa típica: el signed token (TTL 6h) expiró si el usuario dejó
    // la pestaña abierta mucho tiempo. Recargar genera tokens nuevos.
    toast.error(t("teaching.playerErrorToast"));
  }

  const durationLabel = props.durationSeconds
    ? t("teaching.minutes", { minutes: Math.round(props.durationSeconds / 60) })
    : null;

  return (
    <div className="space-y-8">
      {props.muxPlaybackId && props.muxTokens ? (
        <div className="overflow-hidden rounded-xl border bg-gradient-to-br from-brand-violet/[0.08] via-surface-elevated to-brand-coral/[0.06] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
              <PlayCircle className="size-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-brand-coral">
                {durationLabel
                  ? t("teaching.teachingLabelWithDuration", { duration: durationLabel })
                  : t("teaching.teachingLabel")}
              </p>
              <p className="text-sm text-text-secondary">
                {t("teaching.mainVideo")}
              </p>
            </div>
          </div>
          <MuxPlayer
            streamType="on-demand"
            playbackId={props.muxPlaybackId}
            tokens={props.muxTokens}
            startTime={props.startPositionSeconds}
            metadata={{
              video_id: props.sectionId,
              video_title: t("teaching.videoMetadataTitle"),
            }}
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleSeeking}
            onEnded={handleEnded}
            onError={handlePlayerError}
            accentColor="#fdad5a"
            style={{ width: "100%", aspectRatio: "16/9" }}
          />
          {!hasFinished && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-text-tertiary">
              <Lock className="size-3" strokeWidth={2} />
              {t("teaching.finishToMark")}
            </p>
          )}
        </div>
      ) : props.muxPlaybackId ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-amber-400/30 bg-amber-400/10 px-6 py-8 text-center text-sm text-amber-300">
          {t("teaching.loadError")}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-8 text-sm text-white/55">
          {t("teaching.videoPending")}
        </div>
      )}

      {props.bodyMd && <Markdown>{props.bodyMd}</Markdown>}

      {props.resources.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-coral">
            {t("teaching.resources")}
          </h3>
          <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/[0.08] bg-white/[0.02]">
            {props.resources.map((r) => {
              const Icon = RESOURCE_ICON[r.kind];
              return (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-white/90 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="size-4 text-brand-coral" strokeWidth={1.7} />
                      {r.title}
                    </span>
                    <Download className="size-4 text-white/60" />
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
          phaseSlug={props.phaseSlug}
          moduleSlug={props.moduleSlug}
          nextSection="activation"
          label={t("teaching.advanceLabel")}
          disabled={!hasFinished}
          disabledReason={t("teaching.advanceDisabledReason")}
        />
      </div>
    </div>
  );
}
