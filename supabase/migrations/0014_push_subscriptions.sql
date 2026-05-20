-- =====================================================================
-- DAP — 0014: tabla push_subscriptions (Web Push API)
-- =====================================================================
-- Guarda las subscripciones Web Push de cada alumno (puede tener N
-- dispositivos: laptop + celular + tablet). El SEND server-side requiere
-- la lib `web-push` (no instalada todavía — solo armamos el schema +
-- guardado del subscriber).
--
-- Esquema basado en el estándar de PushSubscription.toJSON():
--   { endpoint, keys: { p256dh, auth } }
-- =====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- El alumno solo ve / mutar sus propias subscripciones
create policy "push self read" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push self insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push self delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
create policy "push self update" on public.push_subscriptions
  for update using (auth.uid() = user_id);

-- Admin / service-role pueden leer todo (para mandar push masivo)
create policy "push admin read" on public.push_subscriptions
  for select using (public.is_admin());
