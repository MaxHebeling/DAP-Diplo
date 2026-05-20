-- =====================================================================
-- DAP — 0009: HOTFIX — agregar modules.phase_id con FK a phases
-- =====================================================================
-- Context: phases (9 rows) y blocks (9 rows) son las MISMAS 9 unidades
-- conceptuales (mismos slugs, mismos títulos). El schema histórico tiene
-- modules.block_id → blocks (FK real) pero el código (player, homepage
-- via phases-grid-v2, admin/fases) usa phases vía embed `phases(...)` y
-- `.eq("phase_id", ...)`.
--
-- Esto rompió tras aplicar migrations 0003-0008 que invalidaron el
-- schema cache de PostgREST. Resultado: HTTP 500 en homepage por
-- "Could not find a relationship between 'phases' and 'modules'".
--
-- Fix mínimo: agregar phase_id en modules + populate via match de slug.
-- Cero cambio de código TS. Mantenemos block_id para retro-compat.
-- =====================================================================

alter table public.modules
  add column if not exists phase_id uuid references public.phases(id) on delete cascade;

-- Populate phase_id matching blocks.slug = phases.slug
update public.modules m
set phase_id = p.id
from public.blocks b
join public.phases p on p.slug = b.slug
where m.block_id = b.id
  and m.phase_id is null;

-- Verificación de cobertura
do $$
declare
  v_null int;
begin
  select count(*) into v_null from public.modules where phase_id is null;
  if v_null > 0 then
    raise exception 'modules sin phase_id: %', v_null;
  end if;
end $$;

create index if not exists modules_phase_idx on public.modules(phase_id, order_index);

-- Hint a PostgREST para reload schema cache
notify pgrst, 'reload schema';
