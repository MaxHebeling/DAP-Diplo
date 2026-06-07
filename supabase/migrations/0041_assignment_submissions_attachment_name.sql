-- Agrega attachment_name a assignment_submissions.
--
-- El page admin /admin/correcciones/[id] (introducido en PR #53) selecciona
-- esta columna para mostrar el nombre original del archivo adjunto al admin.
-- Sin la columna, la query Supabase falla y `notFound()` se dispara → 404
-- silencioso al abrir cualquier corrección. Bug detectado en smoke E2E.
--
-- Nullable porque las entregas de solo texto no tienen adjunto.

alter table public.assignment_submissions
  add column if not exists attachment_name text;

comment on column public.assignment_submissions.attachment_name is
  'Nombre original del archivo adjunto (file.name del Upload). Se muestra en la pantalla de review del admin junto al link signed-URL del bucket assignment-attachments. Null si la entrega es solo texto.';
