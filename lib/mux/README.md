# lib/mux/

Helpers Mux.

Archivos planeados (Fase 1):
- `server.ts` — instancia Mux SDK con `MUX_TOKEN_ID` + `MUX_TOKEN_SECRET`.
- `webhook.ts` — verificación de firma de webhooks Mux (video.asset.ready, etc.).
- `playback.ts` — generación de signed playback URLs si se usa signing (recomendado para contenido pagado).

Nunca hostear video en Supabase Storage — siempre Mux.
