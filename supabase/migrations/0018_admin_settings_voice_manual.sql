-- =====================================================================
-- DAP — 0018: admin_settings (key/value) + helper RPC
-- =====================================================================
-- Tabla genérica para settings editables desde el admin (UI). Primera
-- key: 'excorrector_voice_manual' — el voice manual del Dr. Max que
-- alimenta el agente IA. Iterar sin redeploy.
-- =====================================================================

create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

drop policy if exists "admin settings: admin all" on public.admin_settings;
create policy "admin settings: admin all" on public.admin_settings
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_admin_setting(p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.admin_settings where key = p_key limit 1;
$$;

revoke all on function public.get_admin_setting(text) from public;
grant execute on function public.get_admin_setting(text) to service_role, authenticated;
