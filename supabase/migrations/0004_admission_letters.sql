-- =====================================================================
-- DAP — 0004: Aprobación de admisiones + matrícula atómica
-- =====================================================================
-- Aplicar DESPUÉS de 0003. Esta migration añade:
--
--   1. admission_matricula_counters: contador por año para emitir
--      matrículas únicas formato DAP-YYYY-XXXXX sin race conditions.
--   2. next_admission_matricula(): función SECURITY DEFINER que devuelve
--      la siguiente matrícula para el año dado. Atómica vía
--      INSERT ... ON CONFLICT ... RETURNING.
--   3. approve_admission(): función SECURITY DEFINER que ejecuta toda
--      la transacción de aprobación en una sola llamada — locking de
--      la admisión, asignación de matrícula + program_start_date,
--      UPDATE en admissions y profiles. Idempotente: si ya estaba
--      aprobada, devuelve los datos existentes sin re-asignar matrícula.
--   4. reject_admission(): función companion para rechazar con motivo.
--
-- Notas de seguridad:
-- - Ambas funciones son SECURITY DEFINER y verifican is_admin() antes
--   de mutar. Sin admin → exception. Esto evita que un alumno
--   curioso descubra la función y la llame.
-- - search_path = public para evitar hijacking via search_path.
-- - El UPDATE de profiles.admission_status sigue siendo restringido
--   por la migration 0003 (column REVOKE), pero como SECURITY DEFINER
--   bypassea grants y RLS, lo modifica sin problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Contador atómico de matrículas por año
-- ---------------------------------------------------------------------
create table if not exists public.admission_matricula_counters (
  year int primary key,
  next int not null default 1,
  updated_at timestamptz not null default now()
);

comment on table public.admission_matricula_counters is
  'Contador por año para generar matrículas DAP-YYYY-XXXXX de forma atómica.';

alter table public.admission_matricula_counters enable row level security;
-- No policies: solo service-role / SECURITY DEFINER functions deben tocarla.

-- ---------------------------------------------------------------------
-- 2. next_admission_matricula(): emite siguiente matrícula
-- ---------------------------------------------------------------------
create or replace function public.next_admission_matricula(
  target_year int default extract(year from current_date)::int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  insert into public.admission_matricula_counters (year, next)
  values (target_year, 2)
  on conflict (year) do update
    set next = public.admission_matricula_counters.next + 1,
        updated_at = now()
  returning public.admission_matricula_counters.next - 1 into v_next;

  -- Primer caso (insert nuevo año): el RETURNING viene del DO UPDATE,
  -- así que cuando es INSERT plano v_next queda NULL → caemos a 1.
  if v_next is null then
    v_next := 1;
  end if;

  return format('DAP-%s-%s', target_year, lpad(v_next::text, 5, '0'));
end;
$$;

revoke all on function public.next_admission_matricula(int) from public;
grant execute on function public.next_admission_matricula(int) to service_role;

-- ---------------------------------------------------------------------
-- 3. approve_admission(): aprobación atómica
-- ---------------------------------------------------------------------
create or replace function public.approve_admission(
  p_admission_id uuid,
  p_reviewer uuid
)
returns table (
  matricula text,
  program_start_date date,
  user_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission record;
  v_matricula text;
  v_start date;
begin
  -- Solo admin puede llamarla. is_admin() lee public.profiles del
  -- usuario que invoca via auth.uid().
  if not public.is_admin() then
    raise exception 'forbidden: only admins can approve admissions';
  end if;

  -- Lock pesimista sobre la admisión para evitar dobles aprobaciones.
  select * into v_admission
  from public.admissions
  where id = p_admission_id
  for update;

  if v_admission is null then
    raise exception 'admission % not found', p_admission_id;
  end if;

  -- Idempotencia: si ya estaba aprobada, devolvemos la info actual sin
  -- re-asignar matrícula ni cambiar program_start_date.
  if v_admission.status = 'approved' then
    select p.matricula, p.program_start_date
      into v_matricula, v_start
    from public.profiles p
    where p.id = v_admission.user_id;

    matricula := v_matricula;
    program_start_date := v_start;
    user_id := v_admission.user_id;
    return next;
    return;
  end if;

  -- Asignación nueva: program_start_date = primer martes tras hoy.
  v_start := public.next_tuesday(current_date);

  -- Reutilizar matrícula del profile si ya existe (raro, pero posible
  -- si admin cargó una manualmente). Sino, emitir nueva.
  select p.matricula into v_matricula
  from public.profiles p
  where p.id = v_admission.user_id;

  if v_matricula is null then
    v_matricula := public.next_admission_matricula();
  end if;

  -- UPDATE admissions
  update public.admissions
  set
    status = 'approved',
    approved_at = now(),
    reviewed_at = now(),
    reviewed_by = p_reviewer,
    rejection_reason = null,
    updated_at = now()
  where id = p_admission_id;

  -- UPDATE profiles (bypassea column REVOKE por SECURITY DEFINER)
  update public.profiles
  set
    admission_status = 'approved',
    matricula = v_matricula,
    program_start_date = v_start,
    updated_at = now()
  where id = v_admission.user_id;

  matricula := v_matricula;
  program_start_date := v_start;
  user_id := v_admission.user_id;
  return next;
end;
$$;

revoke all on function public.approve_admission(uuid, uuid) from public;
grant execute on function public.approve_admission(uuid, uuid) to service_role;
grant execute on function public.approve_admission(uuid, uuid) to authenticated;
-- authenticated puede invocar pero la función misma exige is_admin()
-- via guard interno. Sin esto el server action (que corre como user
-- autenticado en createClient) no podría llamarla.

-- ---------------------------------------------------------------------
-- 4. reject_admission(): rechazo con motivo
-- ---------------------------------------------------------------------
create or replace function public.reject_admission(
  p_admission_id uuid,
  p_reviewer uuid,
  p_reason text
)
returns table (
  user_id uuid,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admission record;
begin
  if not public.is_admin() then
    raise exception 'forbidden: only admins can reject admissions';
  end if;

  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'rejection reason required';
  end if;

  select * into v_admission
  from public.admissions
  where id = p_admission_id
  for update;

  if v_admission is null then
    raise exception 'admission % not found', p_admission_id;
  end if;

  -- Idempotencia: ya rechazada → no-op pero devolvemos info.
  if v_admission.status = 'rejected' then
    user_id := v_admission.user_id;
    reason := v_admission.rejection_reason;
    return next;
    return;
  end if;

  update public.admissions
  set
    status = 'rejected',
    rejection_reason = trim(p_reason),
    reviewed_at = now(),
    reviewed_by = p_reviewer,
    updated_at = now()
  where id = p_admission_id;

  update public.profiles
  set
    admission_status = 'rejected',
    updated_at = now()
  where id = v_admission.user_id;

  user_id := v_admission.user_id;
  reason := trim(p_reason);
  return next;
end;
$$;

revoke all on function public.reject_admission(uuid, uuid, text) from public;
grant execute on function public.reject_admission(uuid, uuid, text) to service_role;
grant execute on function public.reject_admission(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Verificación rápida
-- ---------------------------------------------------------------------
-- Como service_role:
--   select * from public.next_admission_matricula();
--   -- → DAP-2026-00001
--   select * from public.next_admission_matricula();
--   -- → DAP-2026-00002
--
-- Como authenticated NO admin:
--   select * from public.approve_admission('<uuid>', auth.uid());
--   -- → ERROR: forbidden: only admins can approve admissions
-- =====================================================================
