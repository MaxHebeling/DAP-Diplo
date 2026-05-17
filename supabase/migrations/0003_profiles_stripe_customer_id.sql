-- =====================================================================
-- DAP - Migration 0003: añadir stripe_customer_id a profiles
-- =====================================================================
-- Stripe Customer se crea la primera vez que el alumno entra al
-- checkout de suscripción. Guardamos su id en el profile para reutilizarlo
-- en checkouts posteriores (evita duplicar Customers en Stripe) y
-- vincular eventos del webhook.
-- =====================================================================

alter table public.profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_unique
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- =====================================================================
-- FIN
-- =====================================================================
