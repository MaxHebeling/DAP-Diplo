-- =====================================================================
-- DAP — 0011: HOTFIX read policies + publicar blocks/phases
-- =====================================================================
-- Bug detectado en /fases y /progreso del alumno: las queries devolvían
-- 0 rows aunque las tablas tenían datos.
--
-- Causas:
--   1. phases tenía RLS activa pero CERO policies → bloqueaba a
--      authenticated. Solo service_role pasaba.
--   2. blocks tenía policy "blocks read" exigiendo published=true,
--      pero los 9 rows se sembraron con published=false del default.
--   3. modules.policy depende de blocks.published, así que también
--      colapsaba.
--
-- Fix: agregar policies a phases (mirror de blocks) + publicar los 9
-- blocks (UPDATE published=true).
-- =====================================================================

drop policy if exists "phases read" on public.phases;
create policy "phases read" on public.phases
  for select using (published = true or public.is_admin());

drop policy if exists "phases admin" on public.phases;
create policy "phases admin" on public.phases
  for all using (public.is_admin()) with check (public.is_admin());

update public.blocks set published = true where published = false;
