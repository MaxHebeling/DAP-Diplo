-- Fecha oficial de inicio del programa DAP cohorte 2026-2027.
-- Fuente única de verdad. Si en algún momento se cambia, solo se
-- modifica esta función y todo el sistema queda alineado.
create or replace function public.program_official_start_date()
returns date
language sql
immutable
as $$ select date '2026-06-23' $$;

-- Modifica approve_admission para que program_start_date nunca quede
-- antes del inicio oficial. Si un admin aprueba a alguien antes del
-- 23-jun-2026, su program_start_date queda anclado a esa fecha.
create or replace function public.approve_admission(p_admission_id uuid, p_reviewer uuid)
returns table(matricula text, program_start_date date, user_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admission record;
  v_matricula text;
  v_start date;
  v_next_tue date;
  v_official date;
begin
  if not public.is_admin() then
    raise exception 'forbidden: only admins can approve admissions';
  end if;

  select * into v_admission
  from public.admissions
  where id = p_admission_id
  for update;

  if v_admission is null then
    raise exception 'admission % not found', p_admission_id;
  end if;

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

  v_next_tue := public.next_tuesday(current_date);
  v_official := public.program_official_start_date();
  -- El alumno nunca puede arrancar antes del inicio oficial de la cohorte.
  v_start := greatest(v_next_tue, v_official);

  select p.matricula into v_matricula
  from public.profiles p
  where p.id = v_admission.user_id;

  if v_matricula is null then
    v_matricula := public.next_admission_matricula();
  end if;

  update public.admissions
  set
    status = 'approved',
    approved_at = now(),
    reviewed_at = now(),
    reviewed_by = p_reviewer,
    rejection_reason = null,
    updated_at = now()
  where id = p_admission_id;

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
$function$;

-- Backfill: cualquier alumno ya aprobado con program_start_date NULL o
-- anterior al inicio oficial queda anclado a 2026-06-23.
update public.profiles
set program_start_date = public.program_official_start_date(),
    updated_at = now()
where admission_status = 'approved'
  and (program_start_date is null
       or program_start_date < public.program_official_start_date());
