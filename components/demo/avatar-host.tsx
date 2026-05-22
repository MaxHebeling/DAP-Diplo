"use client";

import MuxPlayer from "@mux/mux-player-react";
import { Sparkles } from "lucide-react";

type Props = {
  /**
   * Mux playback ID (asset con playback policy "public") O URL completa.
   * - Si empieza con "http", se renderiza como iframe (YouTube/Vimeo).
   * - Sino, se trata como Mux playback ID (HLS adaptive via MuxPlayer).
   * - null/undefined → placeholder.
   */
  videoUrl?: string | null;
  posterUrl?: string;
};

export function AvatarHost({ videoUrl, posterUrl }: Props) {
  if (!videoUrl) {
    return <AvatarPlaceholder />;
  }

  // YouTube / Vimeo embed via iframe
  if (/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/i.test(videoUrl)) {
    return (
      <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl shadow-brand-violet/10">
        <div className="aspect-video">
          <iframe
            src={videoUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
            title="Avatar IA — Guía del demo"
          />
        </div>
      </div>
    );
  }

  // Default: Mux playback ID (lo trata como tal)
  // Soporta HLS adaptive en todos los browsers (Safari nativo, Chrome/FF via hls.js)
  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl shadow-brand-violet/10">
      <MuxPlayer
        playbackId={videoUrl}
        poster={posterUrl}
        streamType="on-demand"
        accentColor="#FF4D6D"
        metadata={{
          video_id: "demo-avatar-host",
          video_title: "Avatar IA — Guía del demo DAP",
        }}
        style={{ aspectRatio: "16 / 9", width: "100%" }}
      />
    </div>
  );
}

function AvatarPlaceholder() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-brand-violet/20 via-surface-elevated to-brand-coral/15">
        <div
          aria-hidden
          className="absolute inset-0 [background:radial-gradient(60%_60%_at_50%_50%,rgba(255,77,109,0.18),transparent_60%)]"
        />
        <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand-coral/15 text-brand-coral">
            <Sparkles className="size-8" strokeWidth={1.6} />
          </div>
          <p className="mb-2 font-grotesk text-xl font-bold text-text-primary">
            Tu guía digital se está preparando
          </p>
          <p className="max-w-md font-inter text-sm leading-relaxed text-text-secondary">
            En breve un avatar virtual te va a recibir y te va a llevar
            paso a paso por el módulo. Mientras tanto, podés bajar y
            explorar todo el contenido del módulo directamente.
          </p>
        </div>
      </div>
    </div>
  );
}
