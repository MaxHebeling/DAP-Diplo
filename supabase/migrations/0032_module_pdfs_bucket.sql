-- Bucket público para los PDFs descargables por módulo.
-- Path convention: module-pdfs/<module_id>/<filename>.pdf
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'module-pdfs',
  'module-pdfs',
  true,
  20 * 1024 * 1024,  -- 20MB por archivo
  array['application/pdf']
)
on conflict (id) do nothing;

-- Solo admins pueden subir / actualizar / borrar archivos del bucket.
-- Read es público (bucket.public = true).
drop policy if exists "admin write module-pdfs" on storage.objects;
create policy "admin write module-pdfs"
on storage.objects for all
to authenticated
using (bucket_id = 'module-pdfs' and public.is_admin())
with check (bucket_id = 'module-pdfs' and public.is_admin());
