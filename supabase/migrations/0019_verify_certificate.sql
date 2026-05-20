-- Versiona la RPC verify_certificate que ya existía en la base pero
-- no estaba en migraciones (riesgo: un reset rompía /verificar/[code]).
--
-- SECURITY DEFINER porque se llama desde anon (página pública) y
-- necesita atravesar RLS de certificates/profiles/phases/dimensions
-- sólo para validar un código. La función NO devuelve nada si el
-- código no existe.

create or replace function public.verify_certificate(p_code text)
returns table (
  full_name text,
  phase_order_index integer,
  phase_title text,
  dimension_name text,
  issued_at timestamptz,
  pdf_url text
)
language sql
security definer
set search_path = public
as $$
  select
    p.full_name,
    ph.order_index as phase_order_index,
    ph.title as phase_title,
    d.name as dimension_name,
    c.issued_at,
    c.pdf_url
  from certificates c
  join profiles p on p.id = c.user_id
  join phases ph on ph.id = c.phase_id
  left join dimensions d on d.id = c.dimension_id
  where c.verification_code = p_code
  limit 1;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated, service_role;
