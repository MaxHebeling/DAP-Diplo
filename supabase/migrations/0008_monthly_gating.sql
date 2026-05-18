-- =====================================================================
-- DAP — Migration 0008: Modelo mensual con gating académico
-- =====================================================================
-- ADAPTADA al estado actual de la DB (post-rename Bloques→Fases /
-- Rangos→Dimensiones aplicado en migration 0020).
--
-- Cambia el modelo de "drip por bloque cada 2 meses calendario"
-- al de "gating académico mensual": el alumno avanza al mes siguiente
-- SOLO cuando ha pagado Y ha aprobado los módulos del mes actual.
--
-- Cambios:
--   - modules.course_month (1..18) marca a qué mes académico pertenece.
--   - subscriptions.current_month_number + month_started_at.
--   - DROP phase_access y funciones unlock_next_phase_if_needed,
--     has_phase_access (reemplazadas por el nuevo modelo).
--   - NUEVAS funciones: is_module_approved,
--     count_approved_modules_in_month, is_month_completed,
--     try_advance_month, has_access_to_module, has_access_to_month.
--   - Ajuste de RLS: gating ahora por has_access_to_module.
--
-- Aplicar después del estado actual. El renombre de Bloques→Fases ya
-- fue aplicado en 0020; aquí trabajamos directo sobre phases /
-- dimensions / phase_id.
-- =====================================================================

-- =====================================================================
-- 1. Añadir course_month a modules
-- =====================================================================
alter table public.modules
  add column if not exists course_month int check (course_month between 1 and 18);

-- Distribución por fase:
--   Fases 1-8 (22 módulos cada una, 11/11 split entre 2 meses)
--   Fase 9 (24 módulos, 12/12 split)
--
--   Fase 1 → meses 1, 2
--   Fase 2 → meses 3, 4
--   ...
--   Fase 8 → meses 15, 16
--   Fase 9 → meses 17, 18 (12 módulos por mes)

update public.modules m
set course_month = case
  when p.order_index <= 8 then
    -- Fases 1-8: primer mes = primeros 11; segundo mes = siguientes 11
    (p.order_index - 1) * 2 + 1 + (case when m.order_index > 11 then 1 else 0 end)
  else
    -- Fase 9: primer mes = primeros 12; segundo mes = siguientes 12
    17 + (case when m.order_index > 12 then 1 else 0 end)
  end
from public.phases p
where m.phase_id = p.id
  and m.course_month is null;

-- Hacer NOT NULL ahora que están todos asignados
alter table public.modules
  alter column course_month set not null;

create index if not exists modules_course_month_idx
  on public.modules(course_month, order_index);

-- =====================================================================
-- 2. Añadir current_month_number y month_started_at a subscriptions
-- =====================================================================
alter table public.subscriptions
  add column if not exists current_month_number int not null default 1
    check (current_month_number between 1 and 18),
  add column if not exists month_started_at timestamptz;

-- Inicializar month_started_at para suscripciones existentes
update public.subscriptions
  set month_started_at = coalesce(month_started_at, started_at);

-- =====================================================================
-- 3. DROP del modelo anterior (phase_access + funciones de bloque/fase)
-- =====================================================================
-- Estas son las funciones renombradas en 0020 que ahora reemplazamos
-- por el modelo mensual.
drop function if exists public.has_phase_access(uuid) cascade;
drop function if exists public.unlock_next_phase_if_needed(uuid) cascade;
drop table if exists public.phase_access cascade;

-- =====================================================================
-- 4. Función: ¿módulo aprobado?
-- =====================================================================
-- Un módulo está aprobado cuando:
--   - Las 5 secciones tienen section_progress.completed = true.
--   - El quiz de la sección de evaluación tiene al menos un
--     quiz_attempts.passed = true (si la sección tiene quiz).
create or replace function public.is_module_approved(p_user_id uuid, p_module_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_sections int;
  v_completed_sections int;
  v_quiz_id uuid;
  v_quiz_passed boolean;
begin
  -- Conteo de secciones del módulo
  select count(*) into v_total_sections
  from public.module_sections
  where module_id = p_module_id;

  -- Conteo de secciones completadas por el usuario
  select count(*) into v_completed_sections
  from public.section_progress sp
  join public.module_sections ms on ms.id = sp.module_section_id
  where sp.user_id = p_user_id
    and ms.module_id = p_module_id
    and sp.completed = true;

  if v_total_sections = 0 or v_completed_sections < v_total_sections then
    return false;
  end if;

  -- Si la sección de evaluación tiene quiz, verificar que se aprobó
  select q.id into v_quiz_id
  from public.quizzes q
  join public.module_sections ms on ms.id = q.module_section_id
  where ms.module_id = p_module_id
    and ms.kind = 'evaluation'
  limit 1;

  if v_quiz_id is null then
    -- No hay quiz: con las 5 secciones completadas alcanza
    return true;
  end if;

  select exists (
    select 1 from public.quiz_attempts
    where user_id = p_user_id and quiz_id = v_quiz_id and passed = true
  ) into v_quiz_passed;

  return v_quiz_passed;
end;
$$;

grant execute on function public.is_module_approved(uuid, uuid)
  to authenticated, service_role;

-- =====================================================================
-- 5. Función: contar módulos aprobados en un mes académico
-- =====================================================================
create or replace function public.count_approved_modules_in_month(p_user_id uuid, p_month int)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_module record;
begin
  for v_module in
    select id from public.modules where course_month = p_month
  loop
    if public.is_module_approved(p_user_id, v_module.id) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.count_approved_modules_in_month(uuid, int)
  to authenticated, service_role;

-- =====================================================================
-- 6. Función: ¿está completo el mes?
-- =====================================================================
create or replace function public.is_month_completed(p_user_id uuid, p_month int)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total int;
  v_approved int;
begin
  select count(*) into v_total
  from public.modules
  where course_month = p_month;

  v_approved := public.count_approved_modules_in_month(p_user_id, p_month);

  return v_total > 0 and v_approved >= v_total;
end;
$$;

grant execute on function public.is_month_completed(uuid, int)
  to authenticated, service_role;

-- =====================================================================
-- 7. Función: avanzar al siguiente mes si corresponde
-- =====================================================================
-- Se llama en dos lugares:
--   (a) Webhook invoice.paid (después de incrementar months_paid_total).
--   (b) Al aprobar el último módulo del mes (handler de submit quiz).
--
-- Loop interno: si el alumno ya pagó N meses por adelantado y aprueba
-- todos los módulos pendientes, avanza todos los meses que correspondan.
create or replace function public.try_advance_month(p_user_id uuid)
returns int  -- nuevo current_month_number
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_current int;
  v_completed boolean;
  v_new_month int;
  v_max_iterations int := 18;  -- safety guard contra loops infinitos
begin
  select id, current_month_number, months_paid_total, status
    into v_sub
  from public.subscriptions
  where user_id = p_user_id
    and status in ('active', 'trialing')
  order by created_at desc
  limit 1;

  if v_sub.id is null then
    return null;
  end if;

  v_current := v_sub.current_month_number;
  v_new_month := v_current;

  while v_max_iterations > 0 loop
    v_max_iterations := v_max_iterations - 1;

    -- ¿Pagó el siguiente mes?
    if v_sub.months_paid_total <= v_new_month then
      exit;
    end if;

    -- ¿Existe ese mes? (max 18)
    if v_new_month >= 18 then
      exit;
    end if;

    -- ¿Completó el mes actual?
    v_completed := public.is_month_completed(p_user_id, v_new_month);
    if not v_completed then
      exit;
    end if;

    -- Avanza
    v_new_month := v_new_month + 1;
  end loop;

  if v_new_month > v_current then
    update public.subscriptions
      set current_month_number = v_new_month,
          month_started_at = now(),
          updated_at = now()
      where id = v_sub.id;
  end if;

  return v_new_month;
end;
$$;

grant execute on function public.try_advance_month(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 8. Función: ¿tiene acceso al módulo X?
-- =====================================================================
-- El alumno tiene acceso a un módulo si:
--   - El módulo es is_free_preview = true, O
--   - El alumno tiene suscripción activa Y el course_month del módulo
--     es <= current_month_number del alumno, O
--   - El alumno es admin.
create or replace function public.has_access_to_module(p_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.modules m
      where m.id = p_module_id and m.is_free_preview = true
    )
    or exists (
      select 1
      from public.modules m
      join public.subscriptions s on s.user_id = auth.uid()
      where m.id = p_module_id
        and s.status in ('active', 'trialing')
        and m.course_month <= s.current_month_number
    );
$$;

grant execute on function public.has_access_to_module(uuid)
  to authenticated, service_role;

-- =====================================================================
-- 9. Función: ¿tiene acceso al mes X? (para vista de calendario)
-- =====================================================================
create or replace function public.has_access_to_month(p_month_number int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active', 'trialing')
        and s.current_month_number >= p_month_number
    );
$$;

grant execute on function public.has_access_to_month(int)
  to authenticated, service_role;

-- =====================================================================
-- 10. Reemplazar policies que usaban has_phase_access
-- =====================================================================
-- Las recreamos para que llamen a has_access_to_module.

-- modules: ya tenía policy "modules: read if phase published" — la
-- mantenemos porque solo chequea published, no acceso por suscripción.

-- module_sections: ahora gated por has_access_to_module
drop policy if exists "module_sections: gated" on public.module_sections;
create policy "module_sections: gated"
  on public.module_sections for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m
      where m.id = module_sections.module_id
        and (m.is_free_preview = true or public.has_access_to_module(m.id))
    )
  );

-- module_resources
drop policy if exists "module_resources: gated" on public.module_resources;
create policy "module_resources: gated"
  on public.module_resources for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m
      where m.id = module_resources.module_id
        and (m.is_free_preview = true or public.has_access_to_module(m.id))
    )
  );

-- quizzes
drop policy if exists "quizzes: gated" on public.quizzes;
create policy "quizzes: gated"
  on public.quizzes for select using (
    public.is_admin()
    or exists (
      select 1 from public.module_sections s
      where s.id = quizzes.module_section_id
        and public.has_access_to_module(s.module_id)
    )
  );

-- =====================================================================
-- 11. Verificación
-- =====================================================================
-- Después de aplicar este script, deberías ver:
--   - modules.course_month todos asignados (no nulls).
--   - subscriptions.current_month_number default 1.
--   - 6 funciones nuevas (is_module_approved, count_approved_modules_in_month,
--     is_month_completed, try_advance_month, has_access_to_module,
--     has_access_to_month).
--   - phase_access NO EXISTE.
--   - has_phase_access y unlock_next_phase_if_needed NO EXISTEN.
--
-- Validación de distribución de módulos por mes:
--   select course_month, count(*) from public.modules group by 1 order by 1;
-- Esperado: meses 1-16 con 11 módulos cada uno, meses 17-18 con 12 cada uno.
-- =====================================================================
