-- =====================================================================
-- DAP — 0006: RPC para cron week-open-notify
-- =====================================================================
-- Devuelve los alumnos cuyo "hoy en TZ DAP" coincide con un múltiplo
-- exacto de 7 días desde su program_start_date — es decir, alumnos
-- para los que HOY arranca una nueva semana del programa.
--
-- Requisitos:
--   - admission_status = 'approved'
--   - program_start_date no null
--   - tiene suscripción activa
--   - week resultante en [1, 72]
--
-- SECURITY DEFINER (lo invoca el cron via service_role; igualmente
-- aceptamos llamado de service_role exclusivamente vía grant).
-- =====================================================================

create or replace function public.students_with_new_week_today()
returns table (
  user_id uuid,
  email text,
  full_name text,
  program_start_date date,
  course_week int
)
language sql
stable
security definer
set search_path = public
as $$
  with today_dap as (
    select (now() at time zone public.dap_tz())::date as d
  ),
  candidates as (
    select
      p.id as user_id,
      p.full_name,
      p.program_start_date,
      ( (select d from today_dap) - p.program_start_date ) as diff_days
    from public.profiles p
    where p.admission_status = 'approved'
      and p.program_start_date is not null
      and p.program_start_date <= (select d from today_dap)
  ),
  weekly as (
    select
      c.user_id,
      c.full_name,
      c.program_start_date,
      (c.diff_days / 7 + 1)::int as course_week
    from candidates c
    where c.diff_days >= 0
      and (c.diff_days % 7) = 0
      and (c.diff_days / 7 + 1) between 1 and 72
  )
  select
    w.user_id,
    u.email::text as email,
    w.full_name,
    w.program_start_date,
    w.course_week
  from weekly w
  join auth.users u on u.id = w.user_id
  where exists (
    select 1 from public.subscriptions s
    where s.user_id = w.user_id
      and s.status in ('active','trialing')
  );
$$;

revoke all on function public.students_with_new_week_today() from public;
grant execute on function public.students_with_new_week_today() to service_role;

-- ---------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------
-- Con un alumno cuya program_start_date = hoy en TZ DAP:
--   select * from public.students_with_new_week_today();
--   → 1 fila con course_week = 1
-- Una semana después (program_start_date = hoy - 7 días):
--   → 1 fila con course_week = 2
-- =====================================================================
