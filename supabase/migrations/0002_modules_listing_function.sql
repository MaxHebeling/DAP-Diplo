-- =====================================================================
-- DAP - Migration 0002: función pública para listar módulos publicados
-- =====================================================================
-- Problema: la RLS de `lessons` solo permite ver lecciones cuya
-- is_free_preview = true a usuarios sin enrollment. Eso impide al
-- listado público (anon) calcular la suma de duration_seconds del
-- módulo, que el PLAN exige mostrar.
--
-- Solución: función `security definer` que agrega los datos sin
-- exponer columnas sensibles (mux_playback_id, mux_asset_id).
-- Solo retorna metadata segura (slug, título, precio, duración total
-- y cantidad de lecciones) de módulos donde published = true.
-- =====================================================================

create or replace function public.list_published_modules()
returns table (
  slug                   text,
  title                  text,
  subtitle               text,
  cover_image_url        text,
  price_cents            int,
  order_index            int,
  total_duration_seconds bigint,
  lesson_count           bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.slug,
    m.title,
    m.subtitle,
    m.cover_image_url,
    m.price_cents,
    m.order_index,
    coalesce(sum(l.duration_seconds), 0)::bigint as total_duration_seconds,
    count(l.id)::bigint                          as lesson_count
  from public.modules m
  left join public.lessons l on l.module_id = m.id
  where m.published = true
  group by m.id
  order by m.order_index;
$$;

-- Permitir invocación desde anon (visitantes) y authenticated (alumnos).
grant execute on function public.list_published_modules() to anon, authenticated;

-- =====================================================================
-- FIN
-- =====================================================================
