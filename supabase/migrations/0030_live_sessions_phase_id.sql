-- =====================================================================
-- DAP — Migration 0030: live_sessions.block_id → phase_id
-- =====================================================================
-- El codebase fue renombrado "blocks → phases" hace tiempo. Todas las
-- relaciones nuevas (modules, certificates, etc.) usan phase_id, pero
-- live_sessions quedó con block_id apuntando a la tabla legacy `blocks`.
--
-- Esto rompe en runtime el join `phases!live_sessions_phase_id_fkey`
-- que hacen las pages /admin/en-vivo y /(student)/en-vivo, y los
-- forms admin envían `phase_id` que la DB rechaza.
--
-- Fix: agregar `phase_id` (FK a phases), backfillear desde blocks
-- haciendo match por order_index, y dropear block_id + FK vieja.
-- =====================================================================

alter table public.live_sessions
  add column if not exists phase_id uuid references public.phases(id) on delete set null;

-- Backfill: match blocks → phases por order_index (mismo en ambos).
update public.live_sessions ls
set phase_id = p.id
from public.blocks b
join public.phases p on p.order_index = b.order_index
where ls.block_id = b.id
  and ls.phase_id is null;

-- Drop el FK + columna vieja. ON DELETE SET NULL no rompe nada.
alter table public.live_sessions drop constraint if exists live_sessions_block_id_fkey;
alter table public.live_sessions drop column if exists block_id;

create index if not exists live_sessions_phase_id_idx
  on public.live_sessions(phase_id)
  where phase_id is not null;
