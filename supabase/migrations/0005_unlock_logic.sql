-- =====================================================================
-- DAP - Migration 0005: función unlock_next_block_if_needed
-- =====================================================================
-- Drip de bloques en una sola función SQL, idempotente.
--
-- Reemplaza la lógica inline JS que vivía en /api/webhooks/stripe
-- (handleInvoicePaid). El webhook ahora llama esta función vía RPC.
--
-- FÓRMULA DE DRIP:
--   target_blocks_count = least(9, ceil(months_paid_total / 2.0))
--   Mes 1 → 1 bloque (Fundamentos Espirituales).
--   Mes 2 → 1 bloque.
--   Mes 3 → 2 bloques (Identidad y Carácter desbloquea).
--   Mes 4 → 2 bloques.
--   Mes 5 → 3 bloques.
--   ...
--   Mes 17 → 9 bloques (todo el diplomado).
--
-- IDEMPOTENCIA:
--   ON CONFLICT (user_id, block_id) DO NOTHING en el INSERT, +
--   ROW_COUNT solo cuenta filas realmente insertadas (no conflicts).
--   Llamar la función 5 veces seguidas es seguro: la 1ra hace el
--   trabajo, las otras 4 son no-op.
--
-- EDGE CASES:
--   - Usuario sin suscripción activa → return 0, no inserts.
--   - Usuario ya con 9 bloques → return 0, no inserts.
--   - months_paid_total = 0 → return 0.
-- =====================================================================

create or replace function public.unlock_next_block_if_needed(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months_paid    int;
  v_current_count  int;
  v_target_count   int;
  v_inserted_count int := 0;
begin
  -- 1. Suscripción activa más reciente (active o trialing y no vencida).
  select s.months_paid_total
  into v_months_paid
  from public.subscriptions s
  where s.user_id = p_user_id
    and s.status in ('active', 'trialing')
    and (s.current_period_end is null or s.current_period_end > now())
  order by s.started_at desc
  limit 1;

  -- Sin suscripción activa → no-op.
  if v_months_paid is null then
    return 0;
  end if;

  -- 2. Bloques ya desbloqueados por suscripción para este user.
  select count(*)::int
  into v_current_count
  from public.block_access
  where user_id = p_user_id
    and source = 'subscription';

  -- 3. Target = least(9, ceil(months / 2.0)).
  v_target_count := least(9, ceil(v_months_paid / 2.0)::int);

  -- Ya alcanzó/superó el target (incluyendo ya tener los 9) → no-op.
  if v_target_count <= v_current_count then
    return 0;
  end if;

  -- 4. INSERT los bloques faltantes en orden estricto.
  -- Asume que los desbloqueos por suscripción son secuenciales
  -- (no se saltan bloques). Si hubo manual_grants intermedios
  -- (source distinto), el conflicto se ignora por la UNIQUE constraint.
  insert into public.block_access (user_id, block_id, source, unlocked_at)
  select p_user_id, b.id, 'subscription', now()
  from public.blocks b
  where b.order_index between (v_current_count + 1) and v_target_count
  order by b.order_index
  on conflict (user_id, block_id) do nothing;

  get diagnostics v_inserted_count = row_count;

  return v_inserted_count;
end;
$$;

-- Solo el service_role (webhook) y postgres deberían invocarla.
-- No grant a anon ni authenticated.
grant execute on function public.unlock_next_block_if_needed(uuid) to service_role;

-- =====================================================================
-- FIN
-- =====================================================================
