-- =====================================================================
-- DAP — Migration 0033: marriage_registrations soporte Mercado Pago
-- =====================================================================
-- Inscripciones de matrimonio argentino ahora cobran vía MP (42.000 ARS
-- al mes, cubre a ambos cónyuges). Stripe queda como fallback histórico
-- y para registros antiguos.
-- =====================================================================

alter table public.marriage_registrations
  add column if not exists payment_processor text not null default 'stripe'
    check (payment_processor in ('stripe', 'mercadopago')),
  add column if not exists mp_preapproval_id text unique,
  add column if not exists final_amount_ars int,
  add column if not exists currency text not null default 'USD'
    check (currency in ('USD', 'ARS'));

-- Index para que el webhook MP busque marriage_registrations por preapproval.
create index if not exists marriage_registrations_mp_preapproval_idx
  on public.marriage_registrations(mp_preapproval_id)
  where mp_preapproval_id is not null;
