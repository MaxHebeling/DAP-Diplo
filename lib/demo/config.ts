/**
 * Configuración del demo público (/demo).
 *
 * Cuando Max produzca el avatar IA en HeyGen, reemplazar AVATAR_VIDEO_URL
 * con la URL del MP4 / embed / Mux playback. Soporta:
 *   - YouTube embed: "https://www.youtube.com/embed/<id>"
 *   - Vimeo embed:   "https://player.vimeo.com/video/<id>"
 *   - MP4 directo:   "https://cdn.dapglobal.org/demo-avatar.mp4"
 *   - Mux playback:  "https://stream.mux.com/<playback_id>.m3u8"
 *
 * Si AVATAR_VIDEO_URL es null, el demo muestra el placeholder
 * "Tu guía digital se está preparando" pero el resto del contenido
 * sigue siendo accesible normalmente.
 */
export const AVATAR_VIDEO_URL: string | null = null;

/**
 * Poster (imagen previa al play) opcional. Si null, usa un poster
 * cosmic genérico generado por CSS.
 */
export const AVATAR_POSTER_URL: string | null = null;
