-- =====================================================================
-- DAP — Migration 0032: soporte Mercado Pago AR para suscripciones
-- =====================================================================
-- Routing: visitantes desde Argentina → Mercado Pago (ARS).
-- Visitantes de otros países → Stripe (USD) (sin cambios).
--
-- MP usa "Preapproval" para cobros recurrentes. Cada user que se
-- suscribe vía MP queda con:
--   - payment_processor='mercadopago'
--   - mp_preapproval_id   (id de la suscripción en MP, único)
--   - mp_payer_id         (id del comprador MP, para reuso)
--   - currency='ARS'
--   - amount_minor=3000000  (30.000 ARS · 2 decimales)
--
-- Las filas Stripe quedan con payment_processor='stripe'.
-- =====================================================================

alter table public.subscriptions
  add column if not exists payment_processor text not null default 'stripe'
    check (payment_processor in ('stripe', 'mercadopago')),
  add column if not exists mp_preapproval_id text unique,
  add column if not exists mp_payer_id text,
  add column if not exists currency text not null default 'USD'
    check (currency in ('USD', 'ARS')),
  add column if not exists amount_minor int;

-- Index parcial para buscar por mp_preapproval_id en el webhook.
create index if not exists subscriptions_mp_preapproval_idx
  on public.subscriptions(mp_preapproval_id)
  where mp_preapproval_id is not null;

-- Backfill: todas las subs existentes son stripe + USD + 2500 (25.00 USD).
update public.subscriptions
set currency = 'USD',
    amount_minor = coalesce(amount_minor, 2500)
where payment_processor = 'stripe'
  and amount_minor is null;
