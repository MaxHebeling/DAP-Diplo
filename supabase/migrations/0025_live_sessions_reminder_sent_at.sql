-- =====================================================================
-- 0025: live_sessions.reminder_sent_at
-- =====================================================================
-- El cron /api/cron/live-reminders usa una columna timestamptz
-- `reminder_sent_at` para idempotencia (".is('reminder_sent_at', null)")
-- pero el schema original (0001) solo tiene `reminder_sent boolean`.
-- Cuando se programa el primer Live, el cron tira 500.
--
-- Esta migration:
--   1. Agrega `reminder_sent_at timestamptz null`
--   2. Backfill: si reminder_sent=true, marca reminder_sent_at=created_at
--   3. Deja `reminder_sent` boolean por ahora (sin uses en código) —
--      podemos dropearlo en una migration futura con más confianza.
-- =====================================================================

alter table public.live_sessions
  add column if not exists reminder_sent_at timestamptz null;

-- Backfill aproximado: sesiones que ya tenían el boolean marcado,
-- les ponemos created_at como timestamp de "envío" — no es exacto pero
-- previene que el cron las re-procese.
update public.live_sessions
   set reminder_sent_at = created_at
 where reminder_sent = true
   and reminder_sent_at is null;

create index if not exists live_sessions_reminder_pending_idx
  on public.live_sessions(scheduled_at)
  where reminder_sent_at is null;

comment on column public.live_sessions.reminder_sent_at is
  'Timestamp del envío del recordatorio pre-sesión. NULL = pendiente. Usado por /api/cron/live-reminders con .is(null) para idempotencia.';
