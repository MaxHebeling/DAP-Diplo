-- =====================================================================
-- DAP — Migration 0038: mp_preapproval_id unique COMPUESTO con user_id
-- =====================================================================
-- Para matrimonios MP: 2 filas en subscriptions (una por cónyuge)
-- comparten el mismo mp_preapproval_id. La unique constraint anterior
-- (solo mp_preapproval_id) lo rechazaba.
--
-- Mismo patrón que stripe_subscription_id (unique compuesto con user_id).
-- =====================================================================

alter table public.subscriptions drop constraint if exists subscriptions_mp_preapproval_id_key;
drop index if exists subscriptions_mp_preapproval_id_key;

create unique index if not exists subscriptions_mp_preapproval_user_uniq
  on public.subscriptions(mp_preapproval_id, user_id)
  where mp_preapproval_id is not null;
