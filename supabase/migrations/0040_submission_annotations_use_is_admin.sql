-- Reemplaza las 4 policies admin de submission_annotations para usar
-- public.is_admin() en lugar del patrón EXISTS (FROM profiles WHERE role='admin')
-- repetido 5 veces.
--
-- public.is_admin() es la fn estándar del proyecto (creada en 0001), usada
-- en migrations 0014, 0023 y 0031. Mantener consistencia + un solo lugar
-- donde ajustar la lógica de rol.
--
-- La policy del alumno ("lee anotaciones de sus submissions aprobadas")
-- se queda igual: no usa is_admin().

drop policy if exists "admin lee todas las anotaciones"
  on public.submission_annotations;
drop policy if exists "admin escribe anotaciones"
  on public.submission_annotations;
drop policy if exists "admin actualiza anotaciones"
  on public.submission_annotations;
drop policy if exists "admin borra anotaciones"
  on public.submission_annotations;

create policy "admin lee todas las anotaciones"
  on public.submission_annotations
  for select
  using (public.is_admin());

create policy "admin escribe anotaciones"
  on public.submission_annotations
  for insert
  with check (public.is_admin());

create policy "admin actualiza anotaciones"
  on public.submission_annotations
  for update
  using (public.is_admin());

create policy "admin borra anotaciones"
  on public.submission_annotations
  for delete
  using (public.is_admin());
