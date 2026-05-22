/**
 * Configuración del demo público (/demo).
 *
 * Avatar IA generado en HeyGen → hosteado en Mux con playback policy
 * "public" (sin signed tokens, accesible sin auth). Asset:
 * VD02wQIaFMlu7007TiB3nGmigqBTHpDlM02201Qo8kBl8VM
 */
const MUX_PLAYBACK_ID = "eUYbspAKctas1vc2yur7n0000reBgrz100wtP1YlUatrAo";

// MuxPlayer recibe el playback ID directo (no URL), maneja HLS adaptive.
export const AVATAR_VIDEO_URL: string | null = MUX_PLAYBACK_ID;

export const AVATAR_POSTER_URL: string | null =
  `https://image.mux.com/${MUX_PLAYBACK_ID}/thumbnail.jpg?time=2`;
