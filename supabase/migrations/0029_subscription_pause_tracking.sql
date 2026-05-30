-- =====================================================================
-- DAP — Migration 0029: Tracking de pausa por inactividad
-- =====================================================================
-- Política "pagás solo si avanzás" (visible en /precios, /terminos,
-- /devoluciones, /como-funciona):
--   - 30 días sin avanzar (sin submissions ni section_progress) →
--     Stripe pause_collection ON + email aviso.
--   - 30 días pausado → recordatorio amable.
--   - 50 días pausado → aviso final (10 días para cancelación).
--   - 60 días pausado → cancelación automática.
--
-- El cron `/api/cron/pause-inactive-subs` (vercel.json, daily) opera
-- sobre estas columnas. La pausa real vive en Stripe; estas columnas
-- son nuestro registro local para notificaciones idempotentes.
-- =====================================================================

alter table public.subscriptions
  add column if not exists paused_at timestamptz,
  add column if not exists pause_reason text
    check (pause_reason in ('inactivity', 'manual', 'payment_failed')),
  add column if not exists pause_notified_30_at timestamptz,
  add column if not exists pause_notified_50_at timestamptz,
  add column if not exists canceled_by_inactivity_at timestamptz;

-- Index parcial para que el cron escanee solo lo necesario.
create index if not exists subscriptions_paused_at_idx
  on public.subscriptions(paused_at)
  where paused_at is not null;
