-- =====================================================================
-- DAP — Migration 0009: Pausa automática + timeout de 60 días
-- =====================================================================
-- ADAPTADA al estado actual de la DB (post-rename Bloques→Fases,
-- Rangos→Dimensiones aplicado en migration 0020). Referencias a
-- `blocks` se reemplazan por `phases`, `block_id` por `phase_id`.
--
-- Lógica:
--   1. Si el alumno no completa los módulos del mes actual antes del
--      próximo cobro de Stripe (~3 días antes), la suscripción se
--      pausa: NO se le cobra y mantiene acceso al mes actual.
--   2. Se le notifica:
--      - Día 30 en pausa: email amable.
--      - Día 50 en pausa: email final.
--      - Día 60 en pausa: suscripción se cancela automáticamente.
--   3. El alumno puede pedir UNA extensión por fase (= +60 días extra
--      sin cancelación).
--   4. Cuando completa el último módulo pendiente, la suscripción se
--      reanuda automáticamente.
--
-- Aplicar DESPUÉS de 0008 (monthly gating).
-- =====================================================================

-- =====================================================================
-- 1. Columnas nuevas en subscriptions
-- =====================================================================
alter table public.subscriptions
  add column if not exists paused_at timestamptz,
  add column if not exists pause_reason text
    check (pause_reason in ('incomplete_month', 'manual', 'payment_failed')),
  add column if not exists extension_count int not null default 0
    check (extension_count >= 0 and extension_count <= 9),
  add column if not exists extension_granted_at timestamptz;

create index if not exists subscriptions_paused_idx
  on public.subscriptions(paused_at)
  where paused_at is not null;

-- =====================================================================
-- 2. Tabla auxiliar: extensiones por fase (1 extensión por fase)
-- =====================================================================
create table if not exists public.pause_extensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  phase_id uuid not null references public.phases(id) on delete cascade,
  granted_at timestamptz not null default now(),
  unique (user_id, phase_id)  -- una extensión por fase
);

create index if not exists pause_extensions_user_idx
  on public.pause_extensions(user_id);

alter table public.pause_extensions enable row level security;

drop policy if exists "pause_extensions: self read" on public.pause_extensions;
create policy "pause_extensions: self read"
  on public.pause_extensions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "pause_extensions: admin write" on public.pause_extensions;
create policy "pause_extensions: admin write"
  on public.pause_extensions for all
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- 3. Función: ¿debe pausarse la suscripción? (mes actual incompleto)
-- =====================================================================
create or replace function public.should_pause_for_incomplete_month(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub record;
begin
  select id, current_month_number, status
    into v_sub
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'trialing')
  order by created_at desc
  limit 1;

  if v_sub.id is null then
    return false;
  end if;

  return not public.is_month_completed(p_user_id, v_sub.current_month_number);
end;
$$;

grant execute on function public.should_pause_for_incomplete_month(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 4. Función: ¿está pausada la suscripción?
-- =====================================================================
create or replace function public.is_subscription_paused(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user_id
      and paused_at is not null
      and status in ('active', 'trialing')
  );
$$;

grant execute on function public.is_subscription_paused(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 5. Función: días en pausa (efectivos, restando extensiones)
-- =====================================================================
-- Cada extensión otorgada extiende el plazo 60 días.
-- days_paused = días reales desde paused_at − (extensiones × 60).
create or replace function public.days_paused(p_user_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_paused timestamptz;
  v_extension_count int;
  v_days int;
begin
  select paused_at, extension_count
    into v_paused, v_extension_count
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'trialing')
  order by created_at desc
  limit 1;

  if v_paused is null then
    return 0;
  end if;

  v_days := extract(epoch from (now() - v_paused))::int / 86400;
  return greatest(0, v_days - (v_extension_count * 60));
end;
$$;

grant execute on function public.days_paused(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 6. Función: ¿debe cancelarse por timeout (≥60 días)?
-- =====================================================================
create or replace function public.should_cancel_for_timeout(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.days_paused(p_user_id) >= 60;
$$;

grant execute on function public.should_cancel_for_timeout(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 7. Función: solicitar extensión (1 por fase)
-- =====================================================================
-- Retorna jsonb: { granted: boolean, reason: text, days_added: int }
create or replace function public.request_pause_extension(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_phase_id uuid;
  v_already_extended boolean;
begin
  select s.id, s.current_month_number, s.paused_at, s.extension_count
    into v_sub
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
  order by s.created_at desc
  limit 1;

  if v_sub.id is null then
    return jsonb_build_object('granted', false, 'reason', 'no_active_subscription');
  end if;

  if v_sub.paused_at is null then
    return jsonb_build_object('granted', false, 'reason', 'not_paused');
  end if;

  -- Qué fase corresponde al mes actual del alumno
  select p.id into v_phase_id
  from public.phases p
  join public.modules m on m.phase_id = p.id
  where m.course_month = v_sub.current_month_number
  limit 1;

  if v_phase_id is null then
    return jsonb_build_object('granted', false, 'reason', 'phase_not_found');
  end if;

  -- ¿Ya pidió extensión para esta fase?
  select exists (
    select 1 from public.pause_extensions
    where user_id = p_user_id and phase_id = v_phase_id
  ) into v_already_extended;

  if v_already_extended then
    return jsonb_build_object('granted', false, 'reason', 'already_extended_in_phase');
  end if;

  -- Otorgar extensión
  insert into public.pause_extensions (user_id, phase_id)
    values (p_user_id, v_phase_id);

  update public.subscriptions
    set extension_count = extension_count + 1,
        extension_granted_at = now(),
        updated_at = now()
    where id = v_sub.id;

  return jsonb_build_object(
    'granted', true,
    'reason', 'extension_granted',
    'days_added', 60
  );
end;
$$;

grant execute on function public.request_pause_extension(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 8. Función helper: marcar pausa (la usa el webhook invoice.upcoming)
-- =====================================================================
create or replace function public.mark_subscription_paused(p_user_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub_id uuid;
begin
  select id into v_sub_id
  from public.subscriptions
  where user_id = p_user_id and status in ('active', 'trialing')
  order by created_at desc
  limit 1;

  if v_sub_id is null then
    return false;
  end if;

  update public.subscriptions
    set paused_at = coalesce(paused_at, now()),
        pause_reason = p_reason,
        updated_at = now()
    where id = v_sub_id;

  return true;
end;
$$;

grant execute on function public.mark_subscription_paused(uuid, text)
  to authenticated, service_role;

-- =====================================================================
-- 9. Función helper: quitar pausa (al completar el mes)
-- =====================================================================
create or replace function public.mark_subscription_resumed(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub_id uuid;
begin
  select id into v_sub_id
  from public.subscriptions
  where user_id = p_user_id and status in ('active', 'trialing')
  order by created_at desc
  limit 1;

  if v_sub_id is null then
    return false;
  end if;

  update public.subscriptions
    set paused_at = null,
        pause_reason = null,
        updated_at = now()
    where id = v_sub_id;

  return true;
end;
$$;

grant execute on function public.mark_subscription_resumed(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 10. View: lista de suscripciones que necesitan acción del cron
-- =====================================================================
-- El cron diario consulta esta view y dispara emails / cancelaciones.
-- email_for_notifications se llena vía join con auth.users en el cron;
-- aquí solo exponemos full_name (el cron resuelve el email en runtime).
create or replace view public.subscriptions_pause_status as
select
  s.id,
  s.user_id,
  s.stripe_subscription_id,
  s.paused_at,
  s.extension_count,
  p.full_name,
  public.days_paused(s.user_id) as days_in_pause,
  case
    when public.days_paused(s.user_id) >= 60 then 'cancel_now'
    when public.days_paused(s.user_id) >= 50 then 'email_final_warning'
    when public.days_paused(s.user_id) >= 30 then 'email_friendly_reminder'
    else 'wait'
  end as next_action
from public.subscriptions s
join public.profiles p on p.id = s.user_id
where s.paused_at is not null
  and s.status in ('active', 'trialing');

-- =====================================================================
-- 11. Verificación
-- =====================================================================
-- Columnas nuevas en subscriptions:
--   select column_name from information_schema.columns
--   where table_name = 'subscriptions' and column_name in
--     ('paused_at', 'pause_reason', 'extension_count', 'extension_granted_at');
--
-- Tabla pause_extensions creada:
--   select count(*) from public.pause_extensions;  -- debería ser 0 al inicio
--
-- View de cron:
--   select * from public.subscriptions_pause_status;
-- =====================================================================
