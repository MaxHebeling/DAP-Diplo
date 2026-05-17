# app/(student)/

Rutas que requieren sesión iniciada Y `has_active_subscription()`.

Páginas planeadas:
- `/dashboard` — overview: rango actual, bloque activo, próximos desbloqueos, sesiones en vivo próximas
- `/bloques/[blockSlug]` — vista de un bloque desbloqueado con sus módulos
- `/bloques/[blockSlug]/modulos/[moduleSlug]` — módulo con sus 5 secciones (intro → enseñanza → activación → evaluación → impartición)
- `/perfil` — datos del pastor, rango, certificados, suscripción
- `/comunidad`, `/comunidad/[id]`, `/comunidad/nuevo` — foro (Fase 6)
- `/en-vivo` — calendario de MasterClass, Activaciones y Mentorías (Fase 7)
- `/tutor` — chat con tutor IA + RAG (Fase 8)
- `/certificados` — descarga de certificados emitidos por bloque completado

Gate en `proxy.ts`: si no hay sesión → redirect a `/login?redirectTo=…`. RLS adicional gates contenido por suscripción activa + `block_access`.
