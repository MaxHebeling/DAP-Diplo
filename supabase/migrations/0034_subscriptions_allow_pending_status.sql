-- =====================================================================
-- DAP — Migration 0034: permitir status='pending' en subscriptions
-- =====================================================================
-- El flow Mercado Pago crea filas en `subscriptions` con status='pending'
-- mientras espera la autorización del payer en MP. El check constraint
-- original (heredado del modelo Stripe) NO permitía 'pending' → INSERTs
-- de AR individuales fallaban silenciosos (el código solo logueaba el
-- error pero retornaba checkoutUrl OK) → user iba a MP, pagaba, pero
-- el webhook no encontraba la fila para actualizar → sub fantasma.
--
-- Fix: agregar 'pending' a la whitelist.
-- =====================================================================

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in (
    'pending',
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
  ));
