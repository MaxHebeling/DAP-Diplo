# app/(admin)/

Rutas que requieren `profiles.role = 'admin'`.

Páginas planeadas:
- `/admin/modulos` — CRUD de módulos
- `/admin/modulos/[id]/lecciones` — CRUD de lecciones del módulo
- `/admin/modulos/[id]/lecciones/[lid]/quiz` — editor de quiz por lección
- `/admin/comunidad` — moderación de foro (Fase 3)
- `/admin/en-vivo` — CRUD de sesiones en vivo (Fase 4)
- `/admin/tutor/documentos` — ingesta de PDFs para RAG (Fase 5)

Doble gate: middleware + chequeo `is_admin()` en cada route handler que mute datos.
