-- =====================================================================
-- 0029: leads + visit_logs (CRM básico de marketing)
-- =====================================================================
-- 1. leads          → opt-in capturados via formulario público
-- 2. visit_logs     → log anónimo de visitas para analytics por país
--
-- Política de privacidad: visit_logs guarda hash de IP (no IP raw),
-- pageview anónimo, country del header Vercel. NO tracker third-party,
-- NO cookies. Cumple GDPR/LGPD por diseño.
-- =====================================================================

-- ----- 1. leads --------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  full_name text,
  country text,            -- nombre humano: "Argentina"
  country_code text,       -- ISO alpha-2: "AR"
  phone text,
  message text,
  source text not null default 'landing'
    check (source in ('landing','exit-intent','promo','contacto','footer','other')),
  page_path text,
  status text not null default 'new'
    check (status in ('new','contacted','offered','converted','lost')),
  -- Cuando el admin clickea "Enviar oferta DAP"
  offered_at timestamptz,
  offered_email_id text,   -- Resend message id
  contacted_at timestamptz,
  converted_user_id uuid references public.profiles(id) on delete set null,
  admin_notes text,
  -- IP hasheada (solo para dedupe por sesión, no es PII identificable)
  ip_hash text,
  user_agent_short text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedupe por email: si el mismo lead vuelve, actualizamos el existente
-- desde el server (no via constraint — queremos guardar el último msg).
create index if not exists leads_email_idx on public.leads(lower(email));
create index if not exists leads_status_idx on public.leads(status, created_at desc);
create index if not exists leads_country_idx
  on public.leads(country_code) where country_code is not null;
create index if not exists leads_created_idx on public.leads(created_at desc);

create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

-- ----- 2. visit_logs ---------------------------------------------------
create table if not exists public.visit_logs (
  id bigserial primary key,
  country text,
  country_code text,
  page_path text not null,
  referrer text,
  user_agent_short text,
  ip_hash text,         -- SHA-256 truncado, para dedupe sin almacenar IP
  created_at timestamptz not null default now()
);

create index if not exists visit_logs_created_idx
  on public.visit_logs(created_at desc);
create index if not exists visit_logs_country_idx
  on public.visit_logs(country_code, created_at desc)
  where country_code is not null;
create index if not exists visit_logs_page_idx
  on public.visit_logs(page_path, created_at desc);

-- ----- 3. RLS ----------------------------------------------------------
alter table public.leads enable row level security;
alter table public.visit_logs enable row level security;

-- leads: solo admin lee/edita; insert público OK (form anónimo).
create policy "leads admin all"
  on public.leads
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "leads public insert"
  on public.leads
  for insert
  with check (true);

-- visit_logs: solo admin lee; insert público OK (beacon anónimo).
create policy "visit_logs admin read"
  on public.visit_logs
  for select
  using (public.is_admin());

create policy "visit_logs admin all"
  on public.visit_logs
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "visit_logs public insert"
  on public.visit_logs
  for insert
  with check (true);

-- ----- 4. Comentarios documentales ------------------------------------
comment on table public.leads is
  'Opt-in leads del sitio público: email + nombre + país + mensaje. Capturados desde el form de landing. Admin los gestiona en /admin/leads.';

comment on table public.visit_logs is
  'Log anónimo de visitas. SIN PII (solo país + path + hash de IP). Para dashboard /admin/visitas. Cleanup inline rows > 30 días.';
