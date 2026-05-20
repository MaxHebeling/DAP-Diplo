-- =====================================================================
-- DAP — 0007: Reveal 48h en quizzes
-- =====================================================================
-- Mantiene los attempts ocultos (sin score visible) durante 48h.
--
-- Cambios:
--   1. Columna `revealed_at` en quiz_attempts (nullable). Si NULL y
--      `reveal_at` <= now() → puede revelarse. Si revealed_at != null,
--      el resultado ya se mostró y la cascada de aprobación (si pasó)
--      ya corrió.
--   2. RPC `reveal_quiz_attempt(attempt_id)` SECURITY DEFINER:
--      - SELECT FOR UPDATE el attempt
--      - Si reveal_at > now() → exception (todavía no se puede revelar)
--      - Si revealed_at != null → no-op (devuelve datos actuales)
--      - Set revealed_at = now()
--      - Devuelve datos del attempt para que el caller renderice graded
--        y dispare cascade en TS (section_progress + module + cert).
--      Auth: el usuario solo puede revelar SUS propios attempts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columna revealed_at
-- ---------------------------------------------------------------------
alter table public.quiz_attempts
  add column if not exists revealed_at timestamptz;

comment on column public.quiz_attempts.revealed_at is
  'Cuando el resultado se reveló al alumno (NULL = aún oculto). Junto con reveal_at controla el gate de 48h.';

create index if not exists quiz_attempts_reveal_pending_idx
  on public.quiz_attempts (reveal_at)
  where revealed_at is null;

-- ---------------------------------------------------------------------
-- 2. reveal_quiz_attempt() RPC
-- ---------------------------------------------------------------------
create or replace function public.reveal_quiz_attempt(
  p_attempt_id uuid
)
returns table (
  attempt_id uuid,
  user_id uuid,
  quiz_id uuid,
  score_percent int,
  passed boolean,
  answers jsonb,
  reveal_at timestamptz,
  revealed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_attempt
  from public.quiz_attempts
  where id = p_attempt_id
  for update;

  if v_attempt is null then
    raise exception 'attempt % not found', p_attempt_id;
  end if;

  -- Solo el dueño puede revelar su propio attempt.
  if v_attempt.user_id <> v_uid then
    raise exception 'forbidden: not your attempt';
  end if;

  -- Gate de 48h: si todavía no llegó reveal_at, rechazar.
  if v_attempt.reveal_at is not null
     and v_attempt.reveal_at > now() then
    raise exception 'reveal too early: available at %', v_attempt.reveal_at;
  end if;

  -- Idempotente: si ya se reveló, no actualizamos.
  if v_attempt.revealed_at is null then
    update public.quiz_attempts
      set revealed_at = now()
      where id = p_attempt_id;
    v_attempt.revealed_at := now();
  end if;

  attempt_id := v_attempt.id;
  user_id := v_attempt.user_id;
  quiz_id := v_attempt.quiz_id;
  score_percent := v_attempt.score_percent;
  passed := v_attempt.passed;
  answers := v_attempt.answers;
  reveal_at := v_attempt.reveal_at;
  revealed_at := v_attempt.revealed_at;
  return next;
end;
$$;

revoke all on function public.reveal_quiz_attempt(uuid) from public;
grant execute on function public.reveal_quiz_attempt(uuid) to service_role, authenticated;

-- =====================================================================
