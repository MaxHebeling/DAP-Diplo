-- =====================================================================
-- 0044: Fix infinite recursion in is_admin() when queried from profiles
-- =====================================================================
-- Bug: is_admin() estaba definida como `language sql` + SECURITY DEFINER.
-- El planner de Postgres inlinea funciones SQL simples, y al hacerlo
-- pierde el contexto SECURITY DEFINER — la subquery interna
-- `select from public.profiles` termina evaluándose bajo las policies
-- del user actual. La policy "profiles admin read" llama is_admin() →
-- is_admin() query profiles → dispara "profiles admin read" → recursión
-- infinita → error 42P17 en toda query a profiles desde authenticated.
--
-- Fix: redefinir con `language plpgsql`. Postgres NO inlinea plpgsql,
-- así que SECURITY DEFINER se preserva y la subquery bypasa RLS
-- correctamente.
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
end;
$$;
