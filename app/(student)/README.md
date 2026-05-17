# app/(student)/

Rutas que requieren sesión iniciada (cualquier `profiles.role`).

Páginas planeadas:
- `/dashboard` — módulos inscritos con progreso, recomendaciones
- `/modulos/[slug]/lecciones/[lessonSlug]` — reproductor Mux + recursos + quiz
- `/comunidad`, `/comunidad/[id]`, `/comunidad/nuevo` — foro (Fase 3)
- `/en-vivo` — sesiones programadas (Fase 4)
- `/tutor` — chat con tutor IA + RAG (Fase 5)
- `/certificados` — descarga de certificados emitidos

Gate en `middleware.ts`: si no hay sesión → redirect a `/login`.
