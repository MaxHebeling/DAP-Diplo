-- =====================================================================
-- DAP — Migration 0036: marriage_registrations.mp_preference_id
-- =====================================================================
-- Para matrimonios AR que pagan cash (Checkout Pro) necesitamos guardar
-- el preference_id en marriage_registrations para que el webhook pueda
-- encontrar el matrimonio a partir del payment.preference_id.
-- =====================================================================

alter table public.marriage_registrations
  add column if not exists mp_preference_id text unique;

create index if not exists marriage_registrations_mp_preference_idx
  on public.marriage_registrations(mp_preference_id)
  where mp_preference_id is not null;
