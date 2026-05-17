# app/(admin)/

Rutas que requieren `profiles.role = 'admin'`.

Páginas planeadas:
- `/admin` — dashboard del admin: KPIs (suscriptores activos, MRR, módulos publicados, etc.)
- `/admin/bloques` — CRUD de los 9 bloques (publicar, editar metadatos, cover)
- `/admin/bloques/[blockSlug]/modulos` — listado de los módulos del bloque
- `/admin/bloques/[blockSlug]/modulos/[moduleSlug]` — editor del módulo + sus 5 secciones (subir video Mux por sección, escribir markdown, quiz en la sección de evaluación)
- `/admin/en-vivo` — CRUD de live_sessions (MasterClass/Activación/Mentoría) (Fase 7)
- `/admin/comunidad` — moderación de foro (Fase 6)
- `/admin/tutor/documentos` — ingesta de PDFs para RAG (Fase 8)
- `/admin/usuarios` — vista de suscriptores + acceso manual a bloques

Doble gate: proxy.ts + chequeo `is_admin()` en cada mutación.
