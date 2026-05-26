-- =====================================================================
-- 0026: RLS policies faltantes + hardening de funciones
-- =====================================================================
-- Encontrado por `supabase advisors` (security):
--
-- 1. `student_dimensions` tenía RLS habilitado pero CERO policies →
--    la página /progreso siempre devolvía vacío. Cuando los alumnos
--    completen bloques no verían sus dimensiones ganadas. Bug
--    silencioso que solo aparece en producción con alumnos reales.
--
-- 2. `ai_document_sources` mismo problema → la página
--    /admin/tutor/documentos quedaba vacía para los admins. Las
--    server actions usan adminClient (bypass RLS), pero el listing
--    en la página usaba el cliente con sesión normal.
--
-- 3. Funciones utilitarias `dap_tz`, `next_tuesday`, `set_updated_at`
--    sin `search_path` explícito → vulnerable a schema confusion si
--    el caller controla search_path. Fix: set search_path = public.
--
-- Tablas RLS-no-policy intencionales (NO se tocan):
--   - admission_matricula_counters (service_role only)
--   - rate_limit_attempts          (service_role only)
--   - stripe_events_processed      (service_role only, webhook)
-- =====================================================================

-- ----- 1. student_dimensions -------------------------------------------
create policy "student_dimensions self read"
  on public.student_dimensions
  for select
  using (auth.uid() = user_id);

create policy "student_dimensions admin"
  on public.student_dimensions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- 2. ai_document_sources ------------------------------------------
-- Solo admins necesitan listar (la ingest la hace el adminClient que
-- bypasa RLS de todos modos, así que no afecta el pipeline de tutor).
create policy "ai_document_sources admin"
  on public.ai_document_sources
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- 3. function search_path hardening -------------------------------
-- Re-defino las funciones con `set search_path = public` para que el
-- caller no pueda inyectar resolución de schemas.

alter function public.dap_tz() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.next_tuesday(date) set search_path = public;
-- next_tuesday tiene 2 variantes (date y timestamptz) — el lint lista 2x.
do $$
begin
  perform 1 from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'next_tuesday'
     and pg_get_function_identity_arguments(p.oid) = 'timestamp with time zone';
  if found then
    execute 'alter function public.next_tuesday(timestamptz) set search_path = public';
  end if;
end $$;
