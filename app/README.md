# app/

Rutas Next.js (App Router).

- `(public)/` — rutas sin sesión (landing, login, signup, listado de módulos, detalle de módulo público, verificar certificado).
- `(student)/` — rutas autenticadas del alumno (dashboard, lecciones, foro, tutor IA, certificados).
- `(admin)/` — rutas con `profile.role = 'admin'` (CRUD de módulos, lecciones, quizzes, sesiones en vivo, moderación foro, ingesta de docs IA).
- `api/` — route handlers (webhooks Stripe/Mux, checkout sessions, endpoints internos).

Server Components por defecto. `"use client"` solo cuando se necesite interactividad real.
