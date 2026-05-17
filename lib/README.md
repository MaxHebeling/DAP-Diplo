# lib/

Código compartido sin UI (helpers, clientes de servicios, utilidades).

- `supabase/` — clientes Supabase (server, route handler, browser) y helpers de queries.
- `stripe/` — cliente Stripe + helpers (precios, sesiones, verificación de firma).
- `mux/` — cliente Mux + helpers (assets, playback IDs, firma de URLs).
- `utils.ts` — utilidades sueltas (incluye `cn()` de shadcn). Si crece, separar por archivo (`format.ts`, `slugify.ts`, etc.) sin meter en subcarpeta.

Nada de `"use client"` en este directorio. Helpers puros o server-side.
