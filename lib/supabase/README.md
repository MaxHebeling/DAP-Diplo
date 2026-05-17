# lib/supabase/

Clientes Supabase para los distintos contextos de Next 15 App Router.

Archivos planeados (prompt 0.5):
- `server.ts` — `createClient()` para Server Components (usa cookies de Next).
- `middleware.ts` — `createClient()` para `middleware.ts` (refresh de sesión).
- `client.ts` — `createClient()` para Client Components.
- `admin.ts` — cliente con `SUPABASE_SERVICE_ROLE_KEY` (solo route handlers que lo necesiten, ej. webhook de Stripe insertando enrollments).

**Nunca** importar `admin.ts` desde un Client Component.
