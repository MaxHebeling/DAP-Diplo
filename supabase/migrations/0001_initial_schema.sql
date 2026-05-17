-- =====================================================================
-- DAP - Diplomado Apostólico para Pastores
-- Migration 0001: Initial schema
-- =====================================================================
-- Apply this from Supabase SQL editor or via `supabase db push`.
-- All tables have RLS enabled. Policies live at the bottom of this file.
-- =====================================================================

-- Extensions ------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. PROFILES - extends auth.users
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  ministry_name text,
  country text,
  phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- Auto-create profile when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 2. MODULES - bloques del diplomado (se venden por separado)
-- =====================================================================
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_image_url text,
  order_index int not null default 0,
  price_cents int not null default 0,           -- en centavos USD
  stripe_price_id text,                          -- el Price de Stripe
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index modules_published_idx on public.modules(published, order_index);

-- =====================================================================
-- 3. LESSONS - lecciones dentro de un módulo
-- =====================================================================
create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  mux_asset_id text,
  mux_playback_id text,
  duration_seconds int,
  order_index int not null default 0,
  is_free_preview boolean not null default false, -- vista previa sin compra
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug),
  unique (module_id, order_index)
);

create index lessons_module_idx on public.lessons(module_id, order_index);

-- =====================================================================
-- 4. LESSON RESOURCES - PDFs, audios, links descargables
-- =====================================================================
create table public.lesson_resources (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('pdf', 'audio', 'link', 'slides', 'other')),
  url text not null,
  size_bytes bigint,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index lesson_resources_lesson_idx on public.lesson_resources(lesson_id, order_index);

-- =====================================================================
-- 5. ENROLLMENTS - quién compró qué módulo
-- =====================================================================
create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  stripe_session_id text,                        -- referencia a Stripe Checkout Session
  stripe_payment_intent_id text,
  amount_paid_cents int not null,
  currency text not null default 'usd',
  status text not null default 'active' check (status in ('active', 'refunded', 'revoked')),
  expires_at timestamptz,                        -- null = acceso permanente
  enrolled_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create index enrollments_user_idx on public.enrollments(user_id, status);
create index enrollments_module_idx on public.enrollments(module_id, status);

-- =====================================================================
-- 6. LESSON PROGRESS - progreso por lección por alumno
-- =====================================================================
create table public.lesson_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched_seconds int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  last_position_seconds int not null default 0, -- para "resumir donde quedó"
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index lesson_progress_user_idx on public.lesson_progress(user_id, completed);

-- =====================================================================
-- 7. QUIZZES - exámenes (por lección o por módulo)
-- =====================================================================
create table public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid references public.modules(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  kind text not null check (kind in ('lesson_quiz', 'module_final')),
  pass_threshold int not null default 70,        -- porcentaje mínimo para aprobar
  max_attempts int,                              -- null = infinitos intentos
  shuffle_questions boolean not null default true,
  created_at timestamptz not null default now(),
  -- exactamente uno de module_id o lesson_id debe estar seteado:
  check ((module_id is null) <> (lesson_id is null))
);

create index quizzes_module_idx on public.quizzes(module_id);
create index quizzes_lesson_idx on public.quizzes(lesson_id);

-- =====================================================================
-- 8. QUIZ QUESTIONS
-- =====================================================================
create table public.quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  kind text not null default 'multiple_choice' check (kind in ('multiple_choice', 'true_false')),
  -- options/correct se guardan como JSONB:
  --   multiple_choice: { "options": ["A", "B", "C", "D"], "correct_index": 2 }
  --   true_false:      { "correct": true }
  payload jsonb not null,
  explanation text,                              -- se muestra después de responder
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index quiz_questions_quiz_idx on public.quiz_questions(quiz_id, order_index);

-- =====================================================================
-- 9. QUIZ ATTEMPTS
-- =====================================================================
create table public.quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score_percent int not null,
  passed boolean not null,
  answers jsonb not null,                        -- {question_id: chosen_answer}
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index quiz_attempts_user_idx on public.quiz_attempts(user_id, quiz_id, submitted_at desc);

-- =====================================================================
-- 10. CERTIFICATES
-- =====================================================================
create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  verification_code text not null unique,        -- código corto verificable
  pdf_url text,                                  -- ruta en Supabase Storage
  issued_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create index certificates_user_idx on public.certificates(user_id);

-- =====================================================================
-- 11. FORUM (Fase 3) - comunidad entre pastores
-- =====================================================================
create table public.forum_threads (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_threads_recent_idx on public.forum_threads(created_at desc);
create index forum_threads_module_idx on public.forum_threads(module_id);

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

-- =====================================================================
-- 12. LIVE SESSIONS (Fase 4)
-- =====================================================================
create table public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid references public.modules(id) on delete set null,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  meeting_url text not null,                     -- link de Zoom/Meet
  host_name text,
  recording_url text,                            -- si se sube grabación luego
  created_at timestamptz not null default now()
);

create index live_sessions_schedule_idx on public.live_sessions(scheduled_at desc);

-- =====================================================================
-- 13. AI TUTOR (Fase 5)
-- =====================================================================
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_idx on public.ai_conversations(user_id, updated_at desc);

create table public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  citations jsonb,                               -- fragmentos usados del RAG
  created_at timestamptz not null default now()
);

create index ai_messages_conv_idx on public.ai_messages(conversation_id, created_at);

-- Documentos vectorizados para RAG del tutor
-- (requiere extension vector — habilitar en Supabase dashboard)
-- create extension if not exists vector;
-- create table public.ai_documents (
--   id uuid primary key default uuid_generate_v4(),
--   source_title text not null,
--   chunk_text text not null,
--   chunk_index int not null,
--   embedding vector(1536),
--   metadata jsonb,
--   created_at timestamptz not null default now()
-- );
-- create index ai_documents_embedding_idx on public.ai_documents
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================
-- Filosofía: deny by default. Cada tabla con RLS habilitado y políticas explícitas.

alter table public.profiles            enable row level security;
alter table public.modules             enable row level security;
alter table public.lessons             enable row level security;
alter table public.lesson_resources    enable row level security;
alter table public.enrollments         enable row level security;
alter table public.lesson_progress     enable row level security;
alter table public.quizzes             enable row level security;
alter table public.quiz_questions      enable row level security;
alter table public.quiz_attempts       enable row level security;
alter table public.certificates        enable row level security;
alter table public.forum_threads       enable row level security;
alter table public.forum_posts         enable row level security;
alter table public.live_sessions       enable row level security;
alter table public.ai_conversations    enable row level security;
alter table public.ai_messages         enable row level security;

-- Helper: ¿es admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Helper: ¿está inscrito en este módulo?
create or replace function public.is_enrolled(p_module_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid()
      and module_id = p_module_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

-- profiles -------------------------------------------------------------
create policy "profiles: self can read own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: admin can read all"
  on public.profiles for select using (public.is_admin());
create policy "profiles: self can update own"
  on public.profiles for update using (auth.uid() = id);
create policy "profiles: admin can update all"
  on public.profiles for update using (public.is_admin());

-- modules: published son públicos, drafts solo admin -------------------
create policy "modules: published readable by all"
  on public.modules for select using (published = true or public.is_admin());
create policy "modules: admin full"
  on public.modules for all using (public.is_admin()) with check (public.is_admin());

-- lessons --------------------------------------------------------------
-- Free preview = pública. Resto = solo inscritos o admin.
create policy "lessons: free previews and enrolled"
  on public.lessons for select using (
    is_free_preview = true
    or public.is_enrolled(module_id)
    or public.is_admin()
  );
create policy "lessons: admin full"
  on public.lessons for all using (public.is_admin()) with check (public.is_admin());

-- lesson_resources -----------------------------------------------------
create policy "lesson_resources: enrolled"
  on public.lesson_resources for select using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_resources.lesson_id
        and (l.is_free_preview = true or public.is_enrolled(l.module_id) or public.is_admin())
    )
  );
create policy "lesson_resources: admin full"
  on public.lesson_resources for all using (public.is_admin()) with check (public.is_admin());

-- enrollments ----------------------------------------------------------
create policy "enrollments: self read"
  on public.enrollments for select using (auth.uid() = user_id or public.is_admin());
-- Solo el servidor (con service_role) inserta enrollments tras webhook de Stripe.
-- Admin puede insertar manualmente:
create policy "enrollments: admin insert"
  on public.enrollments for insert with check (public.is_admin());
create policy "enrollments: admin update"
  on public.enrollments for update using (public.is_admin());

-- lesson_progress ------------------------------------------------------
create policy "lesson_progress: self full"
  on public.lesson_progress for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_progress.lesson_id
        and (l.is_free_preview = true or public.is_enrolled(l.module_id))
    )
  );
create policy "lesson_progress: admin read"
  on public.lesson_progress for select using (public.is_admin());

-- quizzes / quiz_questions ---------------------------------------------
create policy "quizzes: enrolled read"
  on public.quizzes for select using (
    (module_id is not null and public.is_enrolled(module_id))
    or (lesson_id is not null and exists (
      select 1 from public.lessons l where l.id = quizzes.lesson_id and public.is_enrolled(l.module_id)
    ))
    or public.is_admin()
  );
create policy "quizzes: admin full"
  on public.quizzes for all using (public.is_admin()) with check (public.is_admin());

create policy "quiz_questions: read with quiz"
  on public.quiz_questions for select using (
    exists (select 1 from public.quizzes q where q.id = quiz_questions.quiz_id)
    -- la policy del quiz ya filtra acceso
  );
create policy "quiz_questions: admin full"
  on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());

-- quiz_attempts: self ---------------------------------------------------
create policy "quiz_attempts: self full"
  on public.quiz_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "quiz_attempts: admin read"
  on public.quiz_attempts for select using (public.is_admin());

-- certificates ----------------------------------------------------------
create policy "certificates: self read"
  on public.certificates for select using (auth.uid() = user_id or public.is_admin());
create policy "certificates: admin full"
  on public.certificates for all using (public.is_admin()) with check (public.is_admin());

-- forum: cualquier alumno con al menos 1 enrollment activo puede leer/escribir
create or replace function public.has_any_enrollment()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid() and status = 'active'
  );
$$;

create policy "forum_threads: enrolled read"
  on public.forum_threads for select using (public.has_any_enrollment() or public.is_admin());
create policy "forum_threads: enrolled write"
  on public.forum_threads for insert with check (
    auth.uid() = author_id and public.has_any_enrollment()
  );
create policy "forum_threads: author or admin update/delete"
  on public.forum_threads for update using (auth.uid() = author_id or public.is_admin());

create policy "forum_posts: enrolled read"
  on public.forum_posts for select using (public.has_any_enrollment() or public.is_admin());
create policy "forum_posts: enrolled write"
  on public.forum_posts for insert with check (
    auth.uid() = author_id and public.has_any_enrollment()
  );
create policy "forum_posts: author or admin update"
  on public.forum_posts for update using (auth.uid() = author_id or public.is_admin());

-- live_sessions ---------------------------------------------------------
create policy "live_sessions: any enrolled read"
  on public.live_sessions for select using (public.has_any_enrollment() or public.is_admin());
create policy "live_sessions: admin full"
  on public.live_sessions for all using (public.is_admin()) with check (public.is_admin());

-- ai_conversations / ai_messages: estrictamente self -------------------
create policy "ai_conversations: self full"
  on public.ai_conversations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_messages: self full"
  on public.ai_messages for all
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
  ));

-- =====================================================================
-- UPDATED_AT TRIGGERS
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger trg_modules_updated       before update on public.modules       for each row execute function public.set_updated_at();
create trigger trg_lessons_updated       before update on public.lessons       for each row execute function public.set_updated_at();
create trigger trg_progress_updated      before update on public.lesson_progress for each row execute function public.set_updated_at();
create trigger trg_threads_updated       before update on public.forum_threads for each row execute function public.set_updated_at();
create trigger trg_posts_updated         before update on public.forum_posts   for each row execute function public.set_updated_at();
create trigger trg_ai_conv_updated       before update on public.ai_conversations for each row execute function public.set_updated_at();

-- =====================================================================
-- FIN
-- =====================================================================
