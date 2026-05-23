-- =====================================================================
-- 0024: rate_limit_attempts
-- =====================================================================
-- Sliding-window rate limiter respaldado por Postgres. Cada attempt es
-- una fila con scope + key (IP o user_id) + timestamp. El helper en
-- lib/security/rate-limit.ts cuenta filas dentro de la ventana antes
-- de aceptar el siguiente request.
--
-- Mantiene la tabla pequeña vía:
--   1. limpieza inline (DELETE de filas > 24h en cada insert)
--   2. índice compuesto para query veloz por scope+key+created_at
-- =====================================================================

create table if not exists public.rate_limit_attempts (
  id bigserial primary key,
  scope text not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_attempts_scope_key_idx
  on public.rate_limit_attempts(scope, key, created_at desc);

-- RLS: la tabla la maneja el service role (admin client). Ningún
-- usuario directo necesita acceder. Habilitamos RLS sin policies
-- para denegar acceso por defecto a clientes con anon/auth.
alter table public.rate_limit_attempts enable row level security;

comment on table public.rate_limit_attempts is
  'Sliding-window rate limit backed by Postgres. Each row = one attempt. Cleanup is inline on insert (purges rows >24h).';
