-- =====================================================================
-- DAP — 0015: RPC para resolver user_id desde email
-- =====================================================================
-- Para tooling admin (ej. /api/admin/push-test). SECURITY DEFINER porque
-- auth.users no es accesible desde el service-role JS client directo.
-- Solo service_role puede invocarla.
-- =====================================================================

create or replace function public.get_user_id_by_email(
  p_email text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to service_role;
