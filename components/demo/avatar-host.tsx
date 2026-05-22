"use client";

import { useState } from "react";
import { Play, Sparkles, Volume2 } from "lucide-react";

type Props = {
  /**
   * URL del video del avatar IA (Mux playback URL, HeyGen public share,
   * MP4 directo, o YouTube embed). Cuando es null/undefined se muestra
   * el placeholder "Avatar IA en preparación".
   */
  videoUrl?: string | null;
  /**
   * Poster image opcional (imagen estática del avatar) para el state
   * pre-play. Si no se pasa, usa un poster genérico cosmic.
   */
  posterUrl?: string;
};

export function AvatarHost({ videoUrl, posterUrl }: Props) {
  const [started, setStarted] = useState(false);

  if (!videoUrl) {
    return <AvatarPlaceholder />;
  }

  // YouTube / Vimeo embed detection
  const isYoutube = /youtube\.com|youtu\.be/i.test(videoUrl);
  const isVimeo = /vimeo\.com/i.test(videoUrl);

  if (isYoutube || isVimeo) {
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

  // MP4 directo o HLS
  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl shadow-brand-violet/10">
      <video
        controls
        playsInline
        autoPlay={started}
        muted={!started}
        poster={posterUrl}
        className="aspect-video w-full"
        onPlay={() => setStarted(true)}
      >
        <source src={videoUrl} />
        Tu navegador no soporta video HTML5.
      </video>
      {!started && (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity hover:bg-black/30"
          aria-label="Reproducir video del avatar"
        >
          <span className="flex flex-col items-center gap-3">
            <span className="flex size-20 items-center justify-center rounded-full bg-brand-coral text-white shadow-2xl shadow-brand-coral/40 transition-transform hover:scale-105">
              <Play className="size-10 fill-white" strokeWidth={0} />
            </span>
            <span className="rounded-full bg-white/10 px-4 py-1.5 font-inter text-xs font-medium uppercase tracking-widest text-white backdrop-blur">
              <Volume2 className="mr-1.5 inline size-3.5" />
              Activá el audio
            </span>
          </span>
        </button>
      )}
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
