import "server-only";
import { muxClient } from "@/lib/mux/server";

export type MuxPlayerTokens = {
  playback: string;
  thumbnail: string;
  storyboard: string;
};

/**
 * Firma los 3 tokens que <MuxPlayer> necesita cuando el asset usa
 * playback_policy="signed". TTL corto (6h) para limitar exposición.
 *
 * Esta función NO valida que el usuario tenga acceso al contenido —
 * eso debe hacerse antes en el server component / endpoint que llama.
 *
 * El SDK de Mux devuelve { "playback-token", "thumbnail-token",
 * "storyboard-token" } (kebab para el web component). Acá lo
 * convertimos al shape que MuxPlayer React espera en el prop `tokens`:
 * { playback, thumbnail, storyboard }.
 */
export async function signMuxPlayerTokens(
  playbackId: string,
  ttlSeconds = 6 * 60 * 60,
): Promise<MuxPlayerTokens> {
  const raw = (await muxClient().jwt.signPlaybackId(playbackId, {
    expiration: `${ttlSeconds}s`,
    type: ["video", "thumbnail", "storyboard"],
  })) as unknown as Record<string, string>;

  return {
    playback: raw["playback-token"],
    thumbnail: raw["thumbnail-token"],
    storyboard: raw["storyboard-token"],
  };
}
