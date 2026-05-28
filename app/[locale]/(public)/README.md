# app/(public)/

Rutas accesibles sin sesión.

Páginas planeadas:
- `/` — landing (en `app/page.tsx`)
- `/login`, `/signup` — auth con Supabase email/password
- `/fases` — vista pública del diplomado: los 9 bloques + sus 72 módulos listados (Fase 2)
- `/fases/[phaseSlug]` — detalle de un bloque (módulos sin acceso al contenido si no hay suscripción)
- `/verificar/[code]` — verificación pública de certificado (Fase 5)
