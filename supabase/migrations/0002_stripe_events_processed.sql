-- =====================================================================
-- DAP — 0002: tabla de idempotencia del webhook de Stripe
-- =====================================================================
-- Aplicar DESPUÉS del schema consolidado v3.3.
-- El webhook de Stripe registra cada event.id procesado para no
-- duplicar el procesamiento si Stripe reenvía el mismo evento.
-- =====================================================================

create table if not exists public.stripe_events_processed (
  id text primary key,                       -- el event.id de Stripe (evt_...)
  type text,                                 -- tipo de evento (informativo)
  processed_at timestamptz not null default now()
);

alter table public.stripe_events_processed enable row level security;

-- Sin policies: solo el service_role (el webhook server-side) puede
-- leer/escribir. Ningún usuario con anon/auth la toca.

-- Verificación:
--   select count(*) from public.stripe_events_processed;  -- 0
