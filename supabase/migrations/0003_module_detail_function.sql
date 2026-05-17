-- =====================================================================
-- DAP - Migration 0003: función pública para detalle de módulo
-- =====================================================================
-- Necesaria para /modulos/[slug]: mostrar al visitante la lista completa
-- de lecciones (título, duración, si es preview) SIN exponer
-- mux_playback_id (que es lo que la RLS de lessons protege).
--
-- Retorna 0 o 1 fila. Las lecciones vienen como JSONB array ordenado.
-- El reproductor real (Fase 1.5) usa la tabla `lessons` directa, donde
-- la RLS sí gatea mux_playback_id por enrollment.
-- =====================================================================

create or replace function public.get_module_detail(p_slug text)
returns table (
  module_id              uuid,
  slug                   text,
  title                  text,
  subtitle               text,
  description            text,
  cover_image_url        text,
  price_cents            int,
  total_duration_seconds bigint,
  lesson_count           bigint,
  lessons                jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as module_id,
    m.slug,
    m.title,
    m.subtitle,
    m.description,
    m.cover_image_url,
    m.price_cents,
    coalesce(sum(l.duration_seconds), 0)::bigint as total_duration_seconds,
    count(l.id)::bigint                          as lesson_count,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slug',             l2.slug,
            'title',            l2.title,
            'duration_seconds', l2.duration_seconds,
            'is_free_preview',  l2.is_free_preview,
            'order_index',      l2.order_index
          ) order by l2.order_index
        )
        from public.lessons l2
        where l2.module_id = m.id
      ),
      '[]'::jsonb
    ) as lessons
  from public.modules m
  left join public.lessons l on l.module_id = m.id
  where m.slug = p_slug and m.published = true
  group by m.id;
$$;

grant execute on function public.get_module_detail(text) to anon, authenticated;

-- =====================================================================
-- FIN
-- =====================================================================
