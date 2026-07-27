-- =====================================================================
-- 0048: church_pastors — relación N:M entre iglesias y pastores
-- =====================================================================
-- Ticket 2 · Portal pastor iglesia-first.
--
-- Reemplaza el modelo pastor↔alumno (pastor_assignments) por
-- pastor↔iglesia. Los alumnos del portal se derivan automáticamente
-- via join: profile.church_id IN (church_pastors del pastor logueado).
--
-- pastor_assignments queda como legacy — no la droppeamos por ahora
-- para no romper /admin/pagos-ar mientras migramos. En una fase
-- posterior se elimina.
-- =====================================================================

create table public.church_pastors (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  pastor_user_id uuid not null references auth.users(id) on delete cascade,
  pastoral_role text not null default 'pastor'
    check (pastoral_role in ('pastor_principal','pastor_ejecutivo','pastor_administrativo','tesorero','pastor','consulta')),
  is_primary boolean not null default false,
  status text not null default 'active'
    check (status in ('active','suspended','revoked')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evita duplicar mismo pastor en misma iglesia (solo un registro
-- activo por par). Los revocados quedan para historial.
create unique index church_pastors_active_uniq
  on public.church_pastors (church_id, pastor_user_id)
  where status = 'active';

create index church_pastors_pastor_idx on public.church_pastors(pastor_user_id) where status = 'active';
create index church_pastors_church_idx on public.church_pastors(church_id) where status = 'active';

create trigger trg_church_pastors_updated
  before update on public.church_pastors
  for each row execute function public.set_updated_at();

-- RLS: pastor puede LEER sus propias asignaciones (para /pastor).
-- Writes solo por service role (admin via createAdminClient).
alter table public.church_pastors enable row level security;

create policy "church_pastors self read"
  on public.church_pastors for select
  to authenticated
  using (pastor_user_id = auth.uid());
