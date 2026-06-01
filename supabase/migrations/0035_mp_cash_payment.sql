-- =====================================================================
-- DAP — Migration 0035: soporte pago efectivo Mercado Pago AR
-- =====================================================================
-- Argentinos sin tarjeta de crédito (mayoría del país) ahora pueden
-- pagar con efectivo en RapiPago / PagoFácil / Western Union vía
-- MP Checkout Pro Preference (NO Preapproval — no es recurrente).
--
-- Modelo: cada mes generamos un nuevo voucher (link Checkout Pro) y
-- se lo mandamos por email. Al pagar, el webhook activa la sub por
-- 30 días. Si no paga en 5 días después de current_period_end, el
-- cron de pausa la marca paused (cron 0036).
--
-- Coexiste con Preapproval (auto-cobro con tarjeta).
-- =====================================================================

alter table public.subscriptions
  add column if not exists payment_method text not null default 'preapproval'
    check (payment_method in ('preapproval', 'checkout_pro')),
  -- ID de la preference más reciente en MP (Checkout Pro).
  add column if not exists mp_preference_id text,
  -- ID del último payment confirmado en MP (auditoría).
  add column if not exists mp_payment_id text,
  -- Cuándo se envió el último voucher al alumno (evita doble envío).
  add column if not exists last_voucher_sent_at timestamptz;

-- Index para que el cron busque solo cash subs próximos a vencer.
create index if not exists subscriptions_cash_renewal_idx
  on public.subscriptions(current_period_end)
  where payment_method = 'checkout_pro' and status = 'active';

-- Index para webhook lookup por preference_id.
create index if not exists subscriptions_mp_preference_idx
  on public.subscriptions(mp_preference_id)
  where mp_preference_id is not null;
