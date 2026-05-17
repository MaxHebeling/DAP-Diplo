-- =====================================================================
-- DAP - Migration 0006: añadir subscriptions.cancel_at
-- =====================================================================
-- Stripe Customer Portal cancela "at period end" usando el campo
-- `cancel_at` (timestamp del fin de periodo), NO `cancel_at_period_end`.
-- Necesitamos persistir ambos para reflejar correctamente el estado.
--
-- Semántica:
--   cancel_at_period_end = true  → cancela legacy (Stripe lo deduce)
--   cancel_at = <timestamp>      → cancela específicamente en esa fecha
--   canceled_at = <timestamp>    → ya fue cancelada físicamente
--
-- Para UI/lógica de "cancelación pendiente":
--   isPendingCancel = cancel_at_period_end OR cancel_at IS NOT NULL
-- =====================================================================

alter table public.subscriptions
  add column if not exists cancel_at timestamptz;

-- =====================================================================
-- FIN
-- =====================================================================
