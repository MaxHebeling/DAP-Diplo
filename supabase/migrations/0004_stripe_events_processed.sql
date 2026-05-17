-- =====================================================================
-- DAP - Migration 0004: tabla stripe_events_processed (idempotencia webhook)
-- =====================================================================
-- Stripe puede reenviar el mismo event id varias veces (retries por
-- timeout, fallos de red, etc.). Antes de procesar, el webhook
-- chequea si el id ya fue procesado; si sí, no-op y devuelve 200.
-- Después de procesar exitosamente, INSERT del id.
--
-- RLS: deny all. Solo service_role (que bypasea RLS) puede tocar
-- esta tabla. Anon/authenticated jamás.
-- =====================================================================

create table if not exists public.stripe_events_processed (
  id text primary key,                      -- event.id de Stripe (evt_…)
  event_type text not null,                 -- e.g. customer.subscription.created
  processed_at timestamptz not null default now()
);

create index if not exists stripe_events_processed_type_idx
  on public.stripe_events_processed (event_type, processed_at desc);

alter table public.stripe_events_processed enable row level security;

-- Sin policies → deny all para anon/authenticated. Solo service_role bypasea.

-- =====================================================================
-- FIN
-- =====================================================================
