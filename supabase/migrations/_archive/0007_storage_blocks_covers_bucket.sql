-- =====================================================================
-- DAP - Migration 0007: bucket Storage blocks-covers + policies
-- =====================================================================
-- Para que el admin pueda subir imagen de portada de cada bloque
-- desde /admin/bloques/[id]/editar, y las imágenes se sirvan
-- públicamente en la landing y en /bloques/[slug].
--
-- - Bucket público (cualquiera lee URLs públicos).
-- - Solo admins escriben/actualizan/borran (vía is_admin()).
-- - Max 5MB por cover; solo image/jpeg|png|webp|avif.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blocks-covers',
  'blocks-covers',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

drop policy if exists "blocks-covers: public read" on storage.objects;
create policy "blocks-covers: public read"
  on storage.objects for select
  using (bucket_id = 'blocks-covers');

drop policy if exists "blocks-covers: admin insert" on storage.objects;
create policy "blocks-covers: admin insert"
  on storage.objects for insert
  with check (bucket_id = 'blocks-covers' and public.is_admin());

drop policy if exists "blocks-covers: admin update" on storage.objects;
create policy "blocks-covers: admin update"
  on storage.objects for update
  using (bucket_id = 'blocks-covers' and public.is_admin());

drop policy if exists "blocks-covers: admin delete" on storage.objects;
create policy "blocks-covers: admin delete"
  on storage.objects for delete
  using (bucket_id = 'blocks-covers' and public.is_admin());

-- =====================================================================
-- FIN
-- =====================================================================
