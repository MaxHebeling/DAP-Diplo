-- =====================================================================
-- DAP — Diplomado Apostólico Pastoral
-- Migration 0001: Schema completo (modelo final)
-- =====================================================================
-- ⚠️  ESTE SCRIPT BORRA EL SCHEMA ANTERIOR Y LO REGENERA.
--     Solo aplicar si el proyecto está pre-launch sin datos reales.
--     Si ya hay usuarios pagando en producción, hay que hacer migration
--     incremental en su lugar.
--
-- Cambios respecto al schema anterior:
--   - Nuevo nivel "blocks" entre Diplomado y Módulos (9 bloques).
--   - "lessons" renombrado a "modules" (las 200 clases de 45-60 min).
--   - Nueva tabla "module_sections" para las 5 partes obligatorias.
--   - "enrollments" reemplazado por "subscriptions" + "block_access"
--     (modelo de suscripción mensual con drip por bloque).
--   - Tabla "ranks" para los 9 rangos (Discípulo → Enviado).
--   - "live_sessions" con tipos: masterclass / activation / mentorship.
-- =====================================================================

-- =====================================================================
-- 0. DROP del schema anterior (solo si existe)
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.ai_messages          cascade;
drop table if exists public.ai_conversations     cascade;
drop table if exists public.live_sessions        cascade;
drop table if exists public.forum_posts          cascade;
drop table if exists public.forum_threads        cascade;
drop table if exists public.certificates         cascade;
drop table if exists public.quiz_attempts        cascade;
drop table if exists public.quiz_questions       cascade;
drop table if exists public.quizzes              cascade;
drop table if exists public.lesson_progress      cascade;
drop table if exists public.enrollments          cascade;
drop table if exists public.lesson_resources     cascade;
drop table if exists public.lessons              cascade;
drop table if exists public.modules              cascade;
drop table if exists public.profiles             cascade;

drop function if exists public.handle_new_user()    cascade;
drop function if exists public.set_updated_at()     cascade;
drop function if exists public.is_admin()           cascade;
drop function if exists public.is_enrolled(uuid)    cascade;
drop function if exists public.has_any_enrollment() cascade;

-- =====================================================================
-- 1. Extensiones
-- =====================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 2. Función updated_at (definida temprano: muchos triggers la usan)
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- =====================================================================
-- 3. PROFILES — extiende auth.users
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  ministry_name text,
  country text,
  phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  avatar_url text,
  current_rank_id uuid,                          -- FK añadido después de crear ranks
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger: al registrarse, crear su perfil
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, ministry_name, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'ministry_name',
    new.raw_user_meta_data->>'country'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 4. RANKS — los 9 rangos del diplomado
-- =====================================================================
create table public.ranks (
  id uuid primary key default uuid_generate_v4(),
  order_index int not null unique check (order_index between 1 and 9),
  name text not null unique,
  description text,
  badge_image_url text,
  created_at timestamptz not null default now()
);

-- FK en profiles ahora que ranks existe
alter table public.profiles
  add constraint profiles_current_rank_id_fkey
  foreign key (current_rank_id) references public.ranks(id) on delete set null;

-- Seed de los 9 rangos
insert into public.ranks (order_index, name, description) values
  (1, 'Discípulo',     'Otorgado al completar el Bloque 1 — Fundamentos Espirituales'),
  (2, 'Hijo',          'Otorgado al completar el Bloque 2 — Identidad y Carácter'),
  (3, 'Líder',         'Otorgado al completar el Bloque 3 — Liderazgo y Discipulado'),
  (4, 'Pastor',        'Otorgado al completar el Bloque 4 — Ministerio y Pastorado'),
  (5, 'Administrador', 'Otorgado al completar el Bloque 5 — Administración y Gobierno'),
  (6, 'Mayordomo',     'Otorgado al completar el Bloque 6 — Finanzas y Economía del Reino'),
  (7, 'Reformador',    'Otorgado al completar el Bloque 7 — Empresas y Expansión'),
  (8, 'Arquitecto',    'Otorgado al completar el Bloque 8 — Tecnología, IA y Comunicación'),
  (9, 'Enviado',       'Otorgado al completar el Bloque 9 — Gobierno Apostólico y Reforma');

-- =====================================================================
-- 5. BLOCKS — los 9 bloques del diplomado
-- =====================================================================
create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  order_index int not null unique check (order_index between 1 and 9),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_image_url text,
  months_duration int not null default 2,
  rank_id uuid references public.ranks(id) on delete set null, -- rango que se desbloquea al completarlo
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blocks_published_idx on public.blocks(published, order_index);

create trigger trg_blocks_updated before update on public.blocks
  for each row execute function public.set_updated_at();

-- Seed de los 9 bloques (sin descripciones largas; se llenan después)
insert into public.blocks (order_index, slug, title, subtitle, rank_id, published) values
  (1, 'fundamentos-espirituales',    'Fundamentos Espirituales',    'Las bases bíblicas del ministerio apostólico',                     (select id from public.ranks where order_index = 1), false),
  (2, 'identidad-y-caracter',        'Identidad y Carácter',        'Formación interior del líder',                                     (select id from public.ranks where order_index = 2), false),
  (3, 'liderazgo-y-discipulado',     'Liderazgo y Discipulado',     'Cómo levantar, formar y multiplicar líderes',                      (select id from public.ranks where order_index = 3), false),
  (4, 'ministerio-y-pastorado',      'Ministerio y Pastorado',      'El corazón pastoral en acción',                                    (select id from public.ranks where order_index = 4), false),
  (5, 'administracion-y-gobierno',   'Administración y Gobierno',   'Estructura, sistemas y orden del ministerio',                      (select id from public.ranks where order_index = 5), false),
  (6, 'finanzas-y-economia-del-reino','Finanzas y Economía del Reino','Mayordomía, generosidad y prosperidad bíblica',                  (select id from public.ranks where order_index = 6), false),
  (7, 'empresas-y-expansion',        'Empresas y Expansión',        'Negocios del Reino y mentalidad emprendedora',                     (select id from public.ranks where order_index = 7), false),
  (8, 'tecnologia-ia-y-comunicacion','Tecnología, IA y Comunicación','Herramientas digitales para ministerios modernos',                (select id from public.ranks where order_index = 8), false),
  (9, 'gobierno-apostolico-y-reforma','Gobierno Apostólico y Reforma','Cultura apostólica y transformación territorial',                (select id from public.ranks where order_index = 9), false);

-- =====================================================================
-- 6. MODULES — las clases de 45–60 min (200 en total)
-- =====================================================================
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  order_index int not null,
  slug text not null,
  title text not null,
  subtitle text,
  description text,
  objective text,                              -- objetivo (parte de la "Introducción")
  main_revelation text,                        -- revelación principal
  impartation_phrase text,                     -- la frase apostólica de cierre del módulo
  duration_minutes int default 50,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, slug),
  unique (block_id, order_index)
);

create index modules_block_idx on public.modules(block_id, order_index);

create trigger trg_modules_updated before update on public.modules
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 7. MODULE_SECTIONS — las 5 partes obligatorias de cada módulo
-- =====================================================================
create table public.module_sections (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  kind text not null check (kind in ('intro', 'teaching', 'activation', 'evaluation', 'impartation')),
  order_index int not null check (order_index between 1 and 5),
  title text not null,
  body_md text,                                -- contenido en markdown
  mux_asset_id text,
  mux_playback_id text,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, kind),                    -- exactamente una sección de cada tipo por módulo
  unique (module_id, order_index)
);

create index module_sections_module_idx on public.module_sections(module_id, order_index);

create trigger trg_module_sections_updated before update on public.module_sections
  for each row execute function public.set_updated_at();

-- Trigger: cuando se crea un módulo, se crean automáticamente las 5 secciones
create or replace function public.create_default_module_sections()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.module_sections (module_id, kind, order_index, title) values
    (new.id, 'intro',       1, 'Introducción'),
    (new.id, 'teaching',    2, 'Enseñanza'),
    (new.id, 'activation',  3, 'Activación'),
    (new.id, 'evaluation',  4, 'Evaluación'),
    (new.id, 'impartation', 5, 'Frase de impartición');
  return new;
end;
$$;

create trigger after_module_insert
  after insert on public.modules
  for each row execute function public.create_default_module_sections();

-- =====================================================================
-- 8. MODULE_RESOURCES — PDFs, audios, links descargables por módulo
-- =====================================================================
create table public.module_resources (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('pdf', 'audio', 'link', 'slides', 'other')),
  url text not null,
  size_bytes bigint,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index module_resources_module_idx on public.module_resources(module_id, order_index);

-- =====================================================================
-- 9. SUBSCRIPTIONS — Stripe Subscription por usuario
-- =====================================================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  months_paid_total int not null default 0,    -- contador acumulado, alimenta el drip
  cancel_at_period_end boolean not null default false,
  started_at timestamptz not null default now(),
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions(user_id, status);
create index subscriptions_stripe_idx on public.subscriptions(stripe_subscription_id);

create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 10. BLOCK_ACCESS — qué bloques tiene desbloqueado cada usuario
-- =====================================================================
create table public.block_access (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  source text not null check (source in ('subscription', 'manual_grant', 'bundle', 'one_time')),
  unlocked_at timestamptz not null default now(),
  unique (user_id, block_id)
);

create index block_access_user_idx on public.block_access(user_id);

-- =====================================================================
-- 11. PROGRESS — por módulo y por sección
-- =====================================================================
create table public.module_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create index module_progress_user_idx on public.module_progress(user_id, completed);

create trigger trg_module_progress_updated before update on public.module_progress
  for each row execute function public.set_updated_at();

create table public.section_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_section_id uuid not null references public.module_sections(id) on delete cascade,
  watched_seconds int not null default 0,
  last_position_seconds int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, module_section_id)
);

create index section_progress_user_idx on public.section_progress(user_id, completed);

create trigger trg_section_progress_updated before update on public.section_progress
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 12. STUDENT_RANKS — rangos otorgados a cada alumno
-- =====================================================================
create table public.student_ranks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank_id uuid not null references public.ranks(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, rank_id)
);

create index student_ranks_user_idx on public.student_ranks(user_id);

-- =====================================================================
-- 13. QUIZZES — uno por sección de evaluación (kind='evaluation')
-- =====================================================================
create table public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  module_section_id uuid not null unique references public.module_sections(id) on delete cascade,
  title text not null,
  description text,
  pass_threshold int not null default 70,
  max_attempts int,                            -- null = ilimitados
  shuffle_questions boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  kind text not null default 'multiple_choice' check (kind in ('multiple_choice', 'true_false')),
  payload jsonb not null,                      -- options + correct_index, etc.
  explanation text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index quiz_questions_quiz_idx on public.quiz_questions(quiz_id, order_index);

create table public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score_percent int not null,
  passed boolean not null,
  answers jsonb not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index quiz_attempts_user_idx on public.quiz_attempts(user_id, quiz_id, submitted_at desc);

-- =====================================================================
-- 14. CERTIFICATES — uno por bloque completado
-- =====================================================================
create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  block_id uuid not null references public.blocks(id) on delete cascade,
  rank_id uuid references public.ranks(id) on delete set null,
  verification_code text not null unique,
  pdf_url text,
  issued_at timestamptz not null default now(),
  unique (user_id, block_id)
);

create index certificates_user_idx on public.certificates(user_id);

-- =====================================================================
-- 15. LIVE_SESSIONS — MasterClass (mié) / Activación (vie) / Mentoría (mensual)
-- =====================================================================
create table public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  block_id uuid references public.blocks(id) on delete set null,  -- opcional: vincular a un bloque temático
  kind text not null check (kind in ('masterclass', 'activation', 'mentorship', 'special')),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  meeting_url text not null,
  host_name text,
  recording_url text,
  recording_mux_playback_id text,
  created_at timestamptz not null default now()
);

create index live_sessions_schedule_idx on public.live_sessions(scheduled_at desc);
create index live_sessions_kind_idx on public.live_sessions(kind, scheduled_at desc);

-- =====================================================================
-- 16. FORUM — comunidad entre pastores
-- =====================================================================
create table public.forum_threads (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  block_id uuid references public.blocks(id) on delete set null,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_threads_recent_idx on public.forum_threads(created_at desc);
create index forum_threads_block_idx on public.forum_threads(block_id);

create trigger trg_forum_threads_updated before update on public.forum_threads
  for each row execute function public.set_updated_at();

create table public.forum_posts (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  parent_post_id uuid references public.forum_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_posts_thread_idx on public.forum_posts(thread_id, created_at);

create trigger trg_forum_posts_updated before update on public.forum_posts
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 17. AI TUTOR (Fase 8)
-- =====================================================================
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_idx on public.ai_conversations(user_id, updated_at desc);

create trigger trg_ai_conversations_updated before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conv_idx on public.ai_messages(conversation_id, created_at);

-- =====================================================================
-- 18. FUNCIONES HELPER
-- =====================================================================

-- ¿Es admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ¿Tiene suscripción activa?
create or replace function public.has_active_subscription()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- ¿Tiene acceso a este bloque? (= suscripción activa Y block_access)
create or replace function public.has_block_access(p_block_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.has_active_subscription()
    and exists (
      select 1 from public.block_access
      where user_id = auth.uid()
        and block_id = p_block_id
    );
$$;

-- =====================================================================
-- 19. RLS — Row Level Security
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.ranks             enable row level security;
alter table public.blocks            enable row level security;
alter table public.modules           enable row level security;
alter table public.module_sections   enable row level security;
alter table public.module_resources  enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.block_access      enable row level security;
alter table public.module_progress   enable row level security;
alter table public.section_progress  enable row level security;
alter table public.student_ranks     enable row level security;
alter table public.quizzes           enable row level security;
alter table public.quiz_questions    enable row level security;
alter table public.quiz_attempts     enable row level security;
alter table public.certificates      enable row level security;
alter table public.live_sessions     enable row level security;
alter table public.forum_threads     enable row level security;
alter table public.forum_posts       enable row level security;
alter table public.ai_conversations  enable row level security;
alter table public.ai_messages       enable row level security;

-- profiles
create policy "profiles: self read"          on public.profiles for select using (auth.uid() = id);
create policy "profiles: admin read all"     on public.profiles for select using (public.is_admin());
create policy "profiles: self update"        on public.profiles for update using (auth.uid() = id);
create policy "profiles: admin update all"   on public.profiles for update using (public.is_admin());

-- ranks (catálogo público)
create policy "ranks: read all"              on public.ranks for select using (true);
create policy "ranks: admin write"           on public.ranks for all using (public.is_admin()) with check (public.is_admin());

-- blocks
create policy "blocks: published readable"   on public.blocks for select using (published = true or public.is_admin());
create policy "blocks: admin full"           on public.blocks for all using (public.is_admin()) with check (public.is_admin());

-- modules (visible si bloque está publicado; contenido detallado gated por has_block_access)
create policy "modules: read if block published" on public.modules for select using (
  exists (select 1 from public.blocks b where b.id = modules.block_id and (b.published or public.is_admin()))
);
create policy "modules: admin full"          on public.modules for all using (public.is_admin()) with check (public.is_admin());

-- module_sections: free preview o has_block_access
create policy "module_sections: gated"       on public.module_sections for select using (
  public.is_admin()
  or exists (
    select 1 from public.modules m
    where m.id = module_sections.module_id
      and (m.is_free_preview = true or public.has_block_access(m.block_id))
  )
);
create policy "module_sections: admin full"  on public.module_sections for all using (public.is_admin()) with check (public.is_admin());

-- module_resources: igual que sections
create policy "module_resources: gated"      on public.module_resources for select using (
  public.is_admin()
  or exists (
    select 1 from public.modules m
    where m.id = module_resources.module_id
      and (m.is_free_preview = true or public.has_block_access(m.block_id))
  )
);
create policy "module_resources: admin full" on public.module_resources for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions: self read, admin read all (writes solo desde server con service_role)
create policy "subscriptions: self read"     on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy "subscriptions: admin write"   on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

-- block_access: self read, admin manage
create policy "block_access: self read"      on public.block_access for select using (auth.uid() = user_id or public.is_admin());
create policy "block_access: admin write"    on public.block_access for all using (public.is_admin()) with check (public.is_admin());

-- module_progress / section_progress: self
create policy "module_progress: self"        on public.module_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "module_progress: admin read"  on public.module_progress for select using (public.is_admin());

create policy "section_progress: self"       on public.section_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "section_progress: admin read" on public.section_progress for select using (public.is_admin());

-- student_ranks
create policy "student_ranks: self read"     on public.student_ranks for select using (auth.uid() = user_id or public.is_admin());
create policy "student_ranks: admin write"   on public.student_ranks for all using (public.is_admin()) with check (public.is_admin());

-- quizzes / quiz_questions / quiz_attempts
create policy "quizzes: gated"               on public.quizzes for select using (
  public.is_admin()
  or exists (
    select 1 from public.module_sections s
    join public.modules m on m.id = s.module_id
    where s.id = quizzes.module_section_id
      and (m.is_free_preview = true or public.has_block_access(m.block_id))
  )
);
create policy "quizzes: admin full"          on public.quizzes for all using (public.is_admin()) with check (public.is_admin());

create policy "quiz_questions: gated"        on public.quiz_questions for select using (
  exists (select 1 from public.quizzes q where q.id = quiz_questions.quiz_id)
);
create policy "quiz_questions: admin full"   on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());

create policy "quiz_attempts: self"          on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quiz_attempts: admin read"    on public.quiz_attempts for select using (public.is_admin());

-- certificates
create policy "certificates: self read"      on public.certificates for select using (auth.uid() = user_id or public.is_admin());
create policy "certificates: admin write"    on public.certificates for all using (public.is_admin()) with check (public.is_admin());

-- live_sessions: visible si tienes subscripción activa
create policy "live_sessions: subscribers"   on public.live_sessions for select using (public.has_active_subscription() or public.is_admin());
create policy "live_sessions: admin full"    on public.live_sessions for all using (public.is_admin()) with check (public.is_admin());

-- forum
create policy "forum_threads: subscribers read" on public.forum_threads for select using (public.has_active_subscription() or public.is_admin());
create policy "forum_threads: subscribers write" on public.forum_threads for insert with check (auth.uid() = author_id and public.has_active_subscription());
create policy "forum_threads: author update"  on public.forum_threads for update using (auth.uid() = author_id or public.is_admin());

create policy "forum_posts: subscribers read" on public.forum_posts for select using (public.has_active_subscription() or public.is_admin());
create policy "forum_posts: subscribers write" on public.forum_posts for insert with check (auth.uid() = author_id and public.has_active_subscription());
create policy "forum_posts: author update"   on public.forum_posts for update using (auth.uid() = author_id or public.is_admin());

-- ai_conversations / ai_messages: estrictamente self
create policy "ai_conversations: self"       on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_messages: self"            on public.ai_messages for all
  using  (exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = auth.uid()));

-- =====================================================================
-- FIN — los 200 módulos se cargan en 0002_seed_modules.sql
-- =====================================================================
