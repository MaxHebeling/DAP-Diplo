-- =====================================================================
-- DAP — 0005: Timezone + ventanas semanales
-- =====================================================================
-- Cambios:
--   1. Define la TZ del programa como constante via función dap_tz().
--      Decisión: America/Mexico_City (sede DAP + público objetivo
--      ES-LatAm; maneja DST automáticamente).
--   2. Actualiza current_program_week() para usar la TZ del programa
--      (no current_date del server, que es UTC).
--   3. Actualiza next_tuesday() para que el offset también respete TZ
--      cuando se llama sin argumento (default = hoy en TZ DAP).
--   4. Nueva función week_window(user_id, course_week) → ventana
--      martes 00:01 — lunes 23:59 EN TZ DAP, devolviendo timestamptz
--      (UTC en wire). Base para crear assignment_submissions.
--   5. Nueva función current_week_window(user_id) → la ventana de la
--      semana en curso del alumno.
--
-- NOTA: estas funciones son STABLE (no IMMUTABLE) porque dependen
-- de now() para el cálculo de "semana actual". Sí cacheables en una
-- misma query (que es lo que Postgres usa).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TZ del programa
-- ---------------------------------------------------------------------
create or replace function public.dap_tz()
returns text language sql immutable as $$
  select 'America/Mexico_City'::text;
$$;

comment on function public.dap_tz() is
  'Timezone del programa DAP. Toda lógica de semanas (martes 00:01 → lunes 23:59) se calcula en esta TZ. Cambiarla acá impacta TODO el calendario; documentar antes de tocar.';

-- ---------------------------------------------------------------------
-- 2. current_program_week() — calcula la semana en TZ DAP
-- ---------------------------------------------------------------------
create or replace function public.current_program_week(p_user_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start date;
  v_today date;
  v_week int;
begin
  select program_start_date into v_start
  from public.profiles where id = p_user_id;
  if v_start is null then return 0; end if;

  -- "Hoy" en la TZ del programa, no en UTC del server.
  v_today := (now() at time zone public.dap_tz())::date;
  if v_start > v_today then return 0; end if;

  v_week := floor((v_today - v_start) / 7.0)::int + 1;
  return least(72, greatest(1, v_week));
end;
$$;

-- ---------------------------------------------------------------------
-- 3. next_tuesday() — overload sin argumento usa hoy en TZ DAP
-- ---------------------------------------------------------------------
create or replace function public.next_tuesday()
returns date
language sql
stable
as $$
  select public.next_tuesday((now() at time zone public.dap_tz())::date);
$$;

-- La versión con argumento (date) sigue como está (immutable). Por
-- claridad la re-declaramos idéntica para que un grep no se confunda.
create or replace function public.next_tuesday(p_from date)
returns date language sql immutable as $$
  select p_from + (((2 - extract(isodow from p_from)::int + 7) % 7)
    + case when extract(isodow from p_from)::int = 2 then 7 else 0 end)::int;
$$;

-- ---------------------------------------------------------------------
-- 4. week_window(user_id, course_week) → (opens_at, closes_at)
-- ---------------------------------------------------------------------
-- Para un alumno con program_start_date = D (martes), la semana N
-- abre el martes D + (N-1)*7 a las 00:01 TZ y cierra el lunes
-- D + N*7 - 1 a las 23:59:00.
--
-- Convertimos timestamps "wall clock" en TZ DAP a timestamptz (UTC)
-- usando AT TIME ZONE — Postgres maneja DST correctamente.
--
-- Retorna NULL/error si program_start_date es null o course_week
-- está fuera de [1,72].
create or replace function public.week_window(
  p_user_id uuid,
  p_course_week int
)
returns table (
  opens_at timestamptz,
  closes_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start date;
  v_week_start date;
  v_week_end date;
  v_tz text := public.dap_tz();
begin
  if p_course_week is null or p_course_week < 1 or p_course_week > 72 then
    raise exception 'course_week must be between 1 and 72, got %', p_course_week;
  end if;

  select program_start_date into v_start
  from public.profiles where id = p_user_id;
  if v_start is null then
    raise exception 'user % has no program_start_date', p_user_id;
  end if;

  -- Martes de la semana N (semana 1 = program_start_date).
  v_week_start := v_start + ((p_course_week - 1) * 7);
  -- Lunes (último día) de la semana N.
  v_week_end := v_week_start + 6;

  opens_at := ((v_week_start::text || ' 00:01:00')::timestamp) at time zone v_tz;
  closes_at := ((v_week_end::text || ' 23:59:00')::timestamp) at time zone v_tz;
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. current_week_window(user_id) → ventana de la semana en curso
-- ---------------------------------------------------------------------
create or replace function public.current_week_window(p_user_id uuid)
returns table (
  opens_at timestamptz,
  closes_at timestamptz,
  course_week int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_week int;
  v_win record;
begin
  v_week := public.current_program_week(p_user_id);
  if v_week = 0 then
    course_week := 0;
    opens_at := null;
    closes_at := null;
    return next;
    return;
  end if;

  select * into v_win from public.week_window(p_user_id, v_week);
  opens_at := v_win.opens_at;
  closes_at := v_win.closes_at;
  course_week := v_week;
  return next;
end;
$$;

revoke all on function public.week_window(uuid, int) from public;
revoke all on function public.current_week_window(uuid) from public;
grant execute on function public.week_window(uuid, int) to service_role, authenticated;
grant execute on function public.current_week_window(uuid) to service_role, authenticated;
grant execute on function public.dap_tz() to public;
grant execute on function public.next_tuesday() to service_role, authenticated;

-- ---------------------------------------------------------------------
-- 6. Verificación
-- ---------------------------------------------------------------------
-- select public.dap_tz();           -- → America/Mexico_City
-- select public.next_tuesday();     -- → próximo martes (en TZ DAP)
-- -- Para un usuario con program_start_date = '2026-05-19' (martes):
-- select * from public.week_window('<uuid>', 1);
--   -- → opens_at = 2026-05-19 00:01 America/Mexico_City
--   -- → closes_at = 2026-05-25 23:59 America/Mexico_City
-- =====================================================================
