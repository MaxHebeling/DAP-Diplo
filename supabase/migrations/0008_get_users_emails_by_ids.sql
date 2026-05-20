-- =====================================================================
-- DAP — 0008: helper para resolver emails de auth.users por batch de ids
-- =====================================================================
-- Necesario para broadcasts (live session announcement, próximamente
-- otros emails masivos). Los emails viven en auth.users, no en profiles,
-- así que el código en TS no puede joinearlo via supabase client normal.
--
-- SECURITY DEFINER + restringido a service_role: solo se llama desde
-- server actions con createAdminClient (no exponer a authenticated).
-- =====================================================================

create or replace function public.get_users_emails_by_ids(
  p_ids uuid[]
)
returns table (
  id uuid,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text
  from auth.users u
  where u.id = any(p_ids);
$$;

revoke all on function public.get_users_emails_by_ids(uuid[]) from public;
grant execute on function public.get_users_emails_by_ids(uuid[]) to service_role;
