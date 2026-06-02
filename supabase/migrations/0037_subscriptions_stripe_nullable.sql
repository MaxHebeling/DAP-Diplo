-- =====================================================================
-- DAP — Migration 0037: subscriptions.stripe_* columns nullable
-- =====================================================================
-- Bug crítico descubierto en producción: stripe_customer_id,
-- stripe_subscription_id y stripe_price_id eran NOT NULL — heredado del
-- modelo original solo-Stripe. El flow Mercado Pago inserta esos
-- campos con NULL → falla silenciosamente.
--
-- Síntoma: matrimonios AR pagaban en MP, webhook llegaba, provisionaba
-- spouse 2, pero NO creaba las 2 filas en subscriptions porque el
-- INSERT fallaba por NOT NULL constraint. Resultado: sub fantasma
-- (pagado en MP, sin acceso en plataforma).
-- =====================================================================

alter table public.subscriptions alter column stripe_customer_id drop not null;
alter table public.subscriptions alter column stripe_subscription_id drop not null;
alter table public.subscriptions alter column stripe_price_id drop not null;
