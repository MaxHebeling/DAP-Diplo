-- =====================================================================
-- DAP — 0016: ADD profiles.stripe_customer_id
-- =====================================================================
-- Bug detectado en /api/checkout/create-subscription: el código consulta
-- profiles.stripe_customer_id pero la columna nunca existía en el schema
-- (faltaba desde la consolidación v3.3 cuando se renombró el flow).
--
-- Agrego la columna nullable + unique. El UPDATE se hace exclusivamente
-- desde server actions con createAdminClient (service-role bypass del
-- column REVOKE del 0003).
-- =====================================================================

alter table public.profiles
  add column if not exists stripe_customer_id text unique;
