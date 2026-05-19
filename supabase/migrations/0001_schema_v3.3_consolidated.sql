-- =====================================================================
-- DAP — SCHEMA CONSOLIDADO v3.3 (un solo archivo)
-- =====================================================================
-- Diplomado Apostólico Pastoral — estado FINAL del modelo.
--
-- Reemplaza TODAS las migrations anteriores (0001..0011). Corre este
-- archivo UNA SOLA VEZ en el SQL Editor de Supabase y deja todo listo:
--   - Schema completo (admisiones, calendario semanal, sin gating/pausa).
--   - 9 rangos + 9 bloques + 72 módulos sembrados.
--   - 360 secciones (auto-creadas por trigger).
--   - Funciones de calendario y certificación.
--   - RLS en todas las tablas.
--
-- ⚠️ BORRA todo lo existente. Solo correr pre-launch (sin datos reales).
--
-- Modelo: 72 módulos (9 bloques × 8), 1 módulo/semana, avance por
-- calendario personal, admisión formal, corrección IA a 48h.
-- =====================================================================

-- =====================================================================
-- 0. DROP de todo lo anterior
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.ai_messages            cascade;
drop table if exists public.ai_conversations       cascade;
drop table if exists public.ai_documents           cascade;
drop table if exists public.forum_posts            cascade;
drop table if exists public.forum_threads          cascade;
drop table if exists public.live_sessions          cascade;
drop table if exists public.certificates           cascade;
drop table if exists public.quiz_attempts          cascade;
drop table if exists public.quiz_questions         cascade;
drop table if exists public.quizzes                cascade;
drop table if exists public.assignment_submissions cascade;
drop table if exists public.section_progress       cascade;
drop table if exists public.module_progress        cascade;
drop table if exists public.student_ranks          cascade;
drop table if exists public.pause_extensions       cascade;
drop table if exists public.block_access           cascade;
drop table if exists public.subscriptions          cascade;
drop table if exists public.module_resources       cascade;
drop table if exists public.module_sections        cascade;
drop table if exists public.modules                cascade;
drop table if exists public.admissions             cascade;
drop table if exists public.lessons                cascade;  -- por si quedó del modelo viejo
drop table if exists public.enrollments            cascade;  -- modelo viejo
drop table if exists public.blocks                 cascade;
drop table if exists public.ranks                  cascade;
drop table if exists public.profiles               cascade;

drop view if exists public.subscriptions_pause_status cascade;

-- Funciones (todas las versiones anteriores)
drop function if exists public.handle_new_user()                       cascade;
drop function if exists public.set_updated_at()                        cascade;
drop function if exists public.is_admin()                              cascade;
drop function if exists public.create_default_module_sections()        cascade;
drop function if exists public.has_active_subscription()               cascade;
drop function if exists public.has_active_subscription(uuid)           cascade;
drop function if exists public.has_block_access(uuid)                  cascade;
drop function if exists public.has_access_to_module(uuid)              cascade;
drop function if exists public.has_access_to_month(int)                cascade;
drop function if exists public.is_enrolled(uuid)                       cascade;
drop function if exists public.is_module_approved(uuid, uuid)          cascade;
drop function if exists public.is_month_completed(uuid, int)           cascade;
drop function if exists public.is_block_completed(uuid, uuid)          cascade;
drop function if exists public.count_approved_modules_in_month(uuid,int) cascade;
drop function if exists public.try_advance_month(uuid)                 cascade;
drop function if exists public.unlock_next_block_if_needed(uuid)       cascade;
drop function if exists public.current_program_week(uuid)              cascade;
drop function if exists public.is_module_week_open(uuid, uuid)         cascade;
drop function if exists public.next_tuesday(date)                      cascade;
drop function if exists public.should_pause_for_incomplete_month(uuid) cascade;
drop function if exists public.is_subscription_paused(uuid)            cascade;
drop function if exists public.days_paused(uuid)                       cascade;
drop function if exists public.should_cancel_for_timeout(uuid)         cascade;
drop function if exists public.request_pause_extension(uuid)           cascade;
drop function if exists public.mark_subscription_paused(uuid, text)    cascade;
drop function if exists public.mark_subscription_resumed(uuid)         cascade;

-- =====================================================================
-- 1. Extensiones
-- =====================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- 2. updated_at helper
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- =====================================================================
-- 3. RANKS (los 9 rangos)
-- =====================================================================
create table public.ranks (
  id uuid primary key default uuid_generate_v4(),
  order_index int not null unique check (order_index between 1 and 9),
  name text not null unique,
  description text,
  badge_image_url text,
  created_at timestamptz not null default now()
);

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
-- 4. PROFILES (extiende auth.users)
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  ministry_name text,
  country text,
  phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  avatar_url text,
  current_rank_id uuid references public.ranks(id) on delete set null,
  program_start_date date,
  matricula text unique,
  admission_status text not null default 'none'
    check (admission_status in ('none', 'pending', 'under_review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

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
-- 5. BLOCKS (9 bloques) + seed
-- =====================================================================
create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  order_index int not null unique check (order_index between 1 and 9),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_image_url text,
  rank_id uuid references public.ranks(id) on delete set null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blocks_published_idx on public.blocks(published, order_index);
create trigger trg_blocks_updated before update on public.blocks
  for each row execute function public.set_updated_at();

insert into public.blocks (order_index, slug, title, subtitle, rank_id, published) values
  (1, 'fundamentos-espirituales',     'Fundamentos Espirituales',     'Las bases bíblicas del ministerio apostólico',  (select id from public.ranks where order_index = 1), false),
  (2, 'identidad-y-caracter',         'Identidad y Carácter',         'Formación interior del líder',                  (select id from public.ranks where order_index = 2), false),
  (3, 'liderazgo-y-discipulado',      'Liderazgo y Discipulado',      'Cómo levantar, formar y multiplicar líderes',   (select id from public.ranks where order_index = 3), false),
  (4, 'ministerio-y-pastorado',       'Ministerio y Pastorado',       'El corazón pastoral en acción',                 (select id from public.ranks where order_index = 4), false),
  (5, 'administracion-y-gobierno',    'Administración y Gobierno',    'Estructura, sistemas y orden del ministerio',   (select id from public.ranks where order_index = 5), false),
  (6, 'finanzas-y-economia-del-reino','Finanzas y Economía del Reino','Mayordomía, generosidad y prosperidad bíblica', (select id from public.ranks where order_index = 6), false),
  (7, 'empresas-y-expansion',         'Empresas y Expansión',         'Negocios del Reino y mentalidad emprendedora',  (select id from public.ranks where order_index = 7), false),
  (8, 'tecnologia-ia-y-comunicacion', 'Tecnología, IA y Comunicación','Herramientas digitales para ministerios',       (select id from public.ranks where order_index = 8), false),
  (9, 'gobierno-apostolico-y-reforma','Gobierno Apostólico y Reforma','Cultura apostólica y transformación territorial',(select id from public.ranks where order_index = 9), false);

-- =====================================================================
-- 6. MODULES (72) — course_week 1..72
-- =====================================================================
create table public.modules (
  id uuid primary key default uuid_generate_v4(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  order_index int not null,           -- 1..8 dentro del bloque
  course_week int not null check (course_week between 1 and 72),
  slug text not null,
  title text not null,
  subtitle text,
  description text,
  objective text,
  main_revelation text,
  impartation_phrase text,
  duration_minutes int default 50,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, slug),
  unique (block_id, order_index),
  unique (course_week)
);

create index modules_block_idx on public.modules(block_id, order_index);
create index modules_week_idx on public.modules(course_week);
create trigger trg_modules_updated before update on public.modules
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 7. MODULE_SECTIONS (5 partes) + trigger auto-crear
-- =====================================================================
create table public.module_sections (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  kind text not null check (kind in ('intro', 'teaching', 'activation', 'evaluation', 'impartation')),
  order_index int not null check (order_index between 1 and 5),
  title text not null,
  body_md text,
  mux_asset_id text,
  mux_playback_id text,
  duration_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, kind),
  unique (module_id, order_index)
);

create index module_sections_module_idx on public.module_sections(module_id, order_index);
create trigger trg_module_sections_updated before update on public.module_sections
  for each row execute function public.set_updated_at();

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
-- 8. SEED de los 72 módulos (las secciones se crean por trigger)
--    course_week = (block.order_index - 1) * 8 + order_index
-- =====================================================================
-- Bloque 1 (semanas 1-8)
with b as (select id from public.blocks where slug='fundamentos-espirituales')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,1,'reino-de-dios','Reino de Dios'),
 ((select id from b),2,2,'identidad-en-cristo','Identidad en Cristo'),
 ((select id from b),3,3,'espiritu-santo','Espíritu Santo'),
 ((select id from b),4,4,'oracion-e-intercesion','Oración e intercesión'),
 ((select id from b),5,5,'autoridad-espiritual','Autoridad espiritual'),
 ((select id from b),6,6,'cultura-del-reino','Cultura del Reino'),
 ((select id from b),7,7,'discipulado','Discipulado'),
 ((select id from b),8,8,'intimidad-con-dios','Intimidad con Dios');

-- Bloque 2 (semanas 9-16)
with b as (select id from public.blocks where slug='identidad-y-caracter')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,9,'espiritu-de-hijo','Espíritu de hijo'),
 ((select id from b),2,10,'identidad-ministerial','Identidad ministerial'),
 ((select id from b),3,11,'sanidad-emocional','Sanidad emocional'),
 ((select id from b),4,12,'caracter-e-integridad','Carácter e integridad'),
 ((select id from b),5,13,'mentalidad-de-reino','Mentalidad de Reino'),
 ((select id from b),6,14,'procesos-formativos','Procesos formativos'),
 ((select id from b),7,15,'vida-familiar','Vida familiar'),
 ((select id from b),8,16,'legado-personal','Legado personal');

-- Bloque 3 (semanas 17-24)
with b as (select id from public.blocks where slug='liderazgo-y-discipulado')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,17,'liderazgo-biblico','Liderazgo bíblico'),
 ((select id from b),2,18,'como-levantar-lideres','Cómo levantar líderes'),
 ((select id from b),3,19,'como-discipular','Cómo discipular'),
 ((select id from b),4,20,'multiplicacion-de-lideres','Multiplicación de líderes'),
 ((select id from b),5,21,'cultura-de-equipos','Cultura de equipos'),
 ((select id from b),6,22,'vision-y-direccion','Visión y dirección'),
 ((select id from b),7,23,'delegacion-y-desarrollo','Delegación y desarrollo'),
 ((select id from b),8,24,'cultura-de-honra','Cultura de honra');

-- Bloque 4 (semanas 25-32)
with b as (select id from public.blocks where slug='ministerio-y-pastorado')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,25,'pastorado-integral','Pastorado integral'),
 ((select id from b),2,26,'predicacion-y-homiletica','Predicación y homilética'),
 ((select id from b),3,27,'consejeria-pastoral','Consejería pastoral'),
 ((select id from b),4,28,'cobertura-y-mentoria','Cobertura y mentoría'),
 ((select id from b),5,29,'lo-profetico-y-sensibilidad','Lo profético y sensibilidad espiritual'),
 ((select id from b),6,30,'manejo-de-crisis-pastorales','Manejo de crisis pastorales'),
 ((select id from b),7,31,'liberacion-y-sanidad','Liberación y sanidad'),
 ((select id from b),8,32,'casas-de-paz-y-discipulado','Casas de paz y discipulado en hogares');

-- Bloque 5 (semanas 33-40)
with b as (select id from public.blocks where slug='administracion-y-gobierno')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,33,'administracion-ministerial','Administración ministerial'),
 ((select id from b),2,34,'sistemas-y-procesos','Sistemas y procesos'),
 ((select id from b),3,35,'planeacion-estrategica','Planeación estratégica'),
 ((select id from b),4,36,'presupuestos-y-gestion-financiera','Presupuestos y gestión financiera'),
 ((select id from b),5,37,'legalidad-y-fundaciones','Legalidad y fundaciones'),
 ((select id from b),6,38,'gestion-de-equipos-y-voluntarios','Gestión de equipos y voluntarios'),
 ((select id from b),7,39,'cultura-organizacional','Cultura organizacional'),
 ((select id from b),8,40,'kpis-ministeriales','KPIs ministeriales');

-- Bloque 6 (semanas 41-48)
with b as (select id from public.blocks where slug='finanzas-y-economia-del-reino')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,41,'economia-biblica','Economía bíblica'),
 ((select id from b),2,42,'mayordomia','Mayordomía'),
 ((select id from b),3,43,'finanzas-personales','Finanzas personales'),
 ((select id from b),4,44,'libertad-financiera','Libertad financiera'),
 ((select id from b),5,45,'finanzas-ministeriales','Finanzas ministeriales'),
 ((select id from b),6,46,'prosperidad-biblica','Prosperidad bíblica'),
 ((select id from b),7,47,'multiples-fuentes-de-ingreso','Múltiples fuentes de ingreso'),
 ((select id from b),8,48,'mentalidad-de-reino-vs-pobreza','Mentalidad de Reino vs mentalidad de pobreza');

-- Bloque 7 (semanas 49-56)
with b as (select id from public.blocks where slug='empresas-y-expansion')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,49,'negocios-del-reino','Negocios del Reino'),
 ((select id from b),2,50,'emprendimiento-apostolico','Emprendimiento apostólico'),
 ((select id from b),3,51,'marca-personal-y-branding','Marca personal y branding'),
 ((select id from b),4,52,'marketing-y-ventas','Marketing y ventas'),
 ((select id from b),5,53,'modelos-de-negocio','Modelos de negocio'),
 ((select id from b),6,54,'liderazgo-empresarial','Liderazgo empresarial'),
 ((select id from b),7,55,'escalabilidad-y-expansion','Escalabilidad y expansión'),
 ((select id from b),8,56,'influencia-cultural','Influencia cultural');

-- Bloque 8 (semanas 57-64)
with b as (select id from public.blocks where slug='tecnologia-ia-y-comunicacion')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,57,'ia-aplicada-al-ministerio','IA aplicada al ministerio'),
 ((select id from b),2,58,'automatizacion-pastoral','Automatización pastoral'),
 ((select id from b),3,59,'produccion-audiovisual-y-streaming','Producción audiovisual y streaming'),
 ((select id from b),4,60,'comunicacion-digital-de-impacto','Comunicación digital de impacto'),
 ((select id from b),5,61,'storytelling-y-narrativa','Storytelling y narrativa apostólica'),
 ((select id from b),6,62,'marca-y-presencia-digital','Marca y presencia digital'),
 ((select id from b),7,63,'crm-ministerial-y-datos','CRM ministerial y gestión de datos'),
 ((select id from b),8,64,'evangelismo-digital','Evangelismo digital');

-- Bloque 9 (semanas 65-72)
with b as (select id from public.blocks where slug='gobierno-apostolico-y-reforma')
insert into public.modules (block_id, order_index, course_week, slug, title) values
 ((select id from b),1,65,'gobierno-apostolico','Gobierno apostólico'),
 ((select id from b),2,66,'cultura-apostolica','Cultura apostólica'),
 ((select id from b),3,67,'reforma-y-transformacion-cultural','Reforma y transformación cultural'),
 ((select id from b),4,68,'plantacion-de-iglesias','Plantación de iglesias'),
 ((select id from b),5,69,'misiones-globales','Misiones globales'),
 ((select id from b),6,70,'sucesion-y-legado-generacional','Sucesión y legado generacional'),
 ((select id from b),7,71,'estrategias-de-reino','Estrategias de Reino'),
 ((select id from b),8,72,'comisionamiento-final','Comisionamiento final');

-- =====================================================================
-- 9. MODULE_RESOURCES
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
-- 10. ADMISSIONS
-- =====================================================================
create table public.admissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  birth_date date,
  country text not null,
  city text,
  phone text not null,
  email text not null,
  church_name text,
  ministry_name text,
  profession text,
  company_or_sector text,
  belongs_to_network boolean not null default false,
  network_name text,
  consent_letter_url text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  admission_letter_url text,
  admission_letter_sent_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admissions_user_idx on public.admissions(user_id);
create index admissions_status_idx on public.admissions(status, approved_at);
create trigger trg_admissions_updated before update on public.admissions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 11. SUBSCRIPTIONS (simple, sin pausa/gating)
-- =====================================================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  status text not null check (status in ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  started_at timestamptz not null default now(),
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions(user_id, status);
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 12. PROGRESS (módulo y sección)
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
-- 13. ASSIGNMENT_SUBMISSIONS (tareas Activación, corrección IA, 48h)
-- =====================================================================
create table public.assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  module_section_id uuid not null references public.module_sections(id) on delete cascade,
  content_text text,
  attachment_url text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open','submitted','correcting','completed','incomplete','not_submitted')),
  submitted_at timestamptz,
  ai_feedback text,
  ai_score int,
  ai_passed boolean,
  corrected_at timestamptz,
  results_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_section_id)
);
create index assignment_submissions_user_idx on public.assignment_submissions(user_id, status);
create index assignment_submissions_correction_idx on public.assignment_submissions(status, submitted_at) where status='submitted';
create trigger trg_assignment_submissions_updated before update on public.assignment_submissions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 14. STUDENT_RANKS
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
-- 15. QUIZZES + questions + attempts (con reveal_at 48h)
-- =====================================================================
create table public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  module_section_id uuid not null unique references public.module_sections(id) on delete cascade,
  title text not null,
  description text,
  pass_threshold int not null default 70,
  max_attempts int,
  shuffle_questions boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  kind text not null default 'multiple_choice' check (kind in ('multiple_choice','true_false')),
  payload jsonb not null,
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
  reveal_at timestamptz,                 -- resultado visible 48h después
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index quiz_attempts_user_idx on public.quiz_attempts(user_id, quiz_id, submitted_at desc);

-- =====================================================================
-- 16. CERTIFICATES
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
-- 17. LIVE_SESSIONS (MasterClass/mentoría por evento)
-- =====================================================================
create table public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  block_id uuid references public.blocks(id) on delete set null,
  kind text not null check (kind in ('masterclass','mentorship','special')),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  meeting_url text not null,
  host_name text,
  recording_url text,
  recording_mux_playback_id text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);
create index live_sessions_schedule_idx on public.live_sessions(scheduled_at desc);

-- =====================================================================
-- 18. FORUM
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
-- 19. AI TUTOR
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
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages(conversation_id, created_at);

-- =====================================================================
-- 20. FUNCIONES (modelo de calendario + certificación)
-- =====================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.has_active_subscription()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active','trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- Semana del programa del alumno (0 si aún no empieza)
create or replace function public.current_program_week(p_user_id uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare v_start date; v_week int;
begin
  select program_start_date into v_start from public.profiles where id = p_user_id;
  if v_start is null or v_start > current_date then return 0; end if;
  v_week := floor((current_date - v_start) / 7.0)::int + 1;
  return least(72, greatest(1, v_week));
end;
$$;

-- Acceso al módulo (por calendario + suscripción)
create or replace function public.has_access_to_module(p_module_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_admin()
    or exists (select 1 from public.modules m where m.id = p_module_id and m.is_free_preview = true)
    or exists (
      select 1 from public.modules m
      join public.subscriptions s on s.user_id = auth.uid()
      where m.id = p_module_id
        and s.status in ('active','trialing')
        and m.course_week <= public.current_program_week(auth.uid())
    );
$$;

-- ¿El módulo está en su ventana activa de esta semana?
create or replace function public.is_module_week_open(p_module_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.modules m
    where m.id = p_module_id and m.course_week = public.current_program_week(p_user_id)
  );
$$;

-- ¿Módulo aprobado? (5 secciones completas + quiz pasado)
create or replace function public.is_module_approved(p_user_id uuid, p_module_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_total int; v_done int; v_quiz uuid; v_passed boolean;
begin
  select count(*) into v_total from public.module_sections where module_id = p_module_id;
  select count(*) into v_done
    from public.section_progress sp
    join public.module_sections ms on ms.id = sp.module_section_id
    where sp.user_id = p_user_id and ms.module_id = p_module_id and sp.completed = true;
  if v_total = 0 or v_done < v_total then return false; end if;

  select q.id into v_quiz
    from public.quizzes q
    join public.module_sections ms on ms.id = q.module_section_id
    where ms.module_id = p_module_id and ms.kind = 'evaluation' limit 1;
  if v_quiz is null then return true; end if;

  select exists (select 1 from public.quiz_attempts where user_id = p_user_id and quiz_id = v_quiz and passed = true)
    into v_passed;
  return v_passed;
end;
$$;

-- ¿Bloque completo? (los 8 módulos aprobados) → para rango
create or replace function public.is_block_completed(p_user_id uuid, p_block_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_total int; v_approved int := 0; v_m record;
begin
  select count(*) into v_total from public.modules where block_id = p_block_id;
  for v_m in select id from public.modules where block_id = p_block_id loop
    if public.is_module_approved(p_user_id, v_m.id) then v_approved := v_approved + 1; end if;
  end loop;
  return v_total > 0 and v_approved >= v_total;
end;
$$;

-- Primer martes después de una fecha (= program_start_date al aprobar admisión)
create or replace function public.next_tuesday(p_from date)
returns date language sql immutable as $$
  select p_from + (((2 - extract(isodow from p_from)::int + 7) % 7)
    + case when extract(isodow from p_from)::int = 2 then 7 else 0 end)::int;
$$;

-- =====================================================================
-- 21. RLS
-- =====================================================================
alter table public.ranks                 enable row level security;
alter table public.profiles              enable row level security;
alter table public.blocks                enable row level security;
alter table public.modules               enable row level security;
alter table public.module_sections       enable row level security;
alter table public.module_resources      enable row level security;
alter table public.admissions            enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.module_progress       enable row level security;
alter table public.section_progress      enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.student_ranks         enable row level security;
alter table public.quizzes               enable row level security;
alter table public.quiz_questions        enable row level security;
alter table public.quiz_attempts         enable row level security;
alter table public.certificates          enable row level security;
alter table public.live_sessions         enable row level security;
alter table public.forum_threads         enable row level security;
alter table public.forum_posts           enable row level security;
alter table public.ai_conversations      enable row level security;
alter table public.ai_messages           enable row level security;

-- ranks: catálogo público
create policy "ranks read" on public.ranks for select using (true);
create policy "ranks admin" on public.ranks for all using (public.is_admin()) with check (public.is_admin());

-- profiles
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles admin read" on public.profiles for select using (public.is_admin());
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles admin update" on public.profiles for update using (public.is_admin());

-- blocks
create policy "blocks read" on public.blocks for select using (published = true or public.is_admin());
create policy "blocks admin" on public.blocks for all using (public.is_admin()) with check (public.is_admin());

-- modules
create policy "modules read" on public.modules for select using (
  exists (select 1 from public.blocks b where b.id = modules.block_id and (b.published or public.is_admin()))
);
create policy "modules admin" on public.modules for all using (public.is_admin()) with check (public.is_admin());

-- module_sections (gated por calendario)
create policy "sections read" on public.module_sections for select using (
  public.is_admin() or exists (
    select 1 from public.modules m where m.id = module_sections.module_id
      and (m.is_free_preview = true or public.has_access_to_module(m.id))
  )
);
create policy "sections admin" on public.module_sections for all using (public.is_admin()) with check (public.is_admin());

-- module_resources
create policy "resources read" on public.module_resources for select using (
  public.is_admin() or exists (
    select 1 from public.modules m where m.id = module_resources.module_id
      and (m.is_free_preview = true or public.has_access_to_module(m.id))
  )
);
create policy "resources admin" on public.module_resources for all using (public.is_admin()) with check (public.is_admin());

-- admissions
create policy "adm self read" on public.admissions for select using (auth.uid() = user_id or public.is_admin());
create policy "adm self insert" on public.admissions for insert with check (auth.uid() = user_id);
create policy "adm self update pending" on public.admissions for update using (auth.uid() = user_id and status = 'pending');
create policy "adm admin" on public.admissions for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions
create policy "subs self read" on public.subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy "subs admin" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

-- progress
create policy "mprog self" on public.module_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mprog admin read" on public.module_progress for select using (public.is_admin());
create policy "sprog self" on public.section_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sprog admin read" on public.section_progress for select using (public.is_admin());

-- assignment_submissions
create policy "asg self" on public.assignment_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "asg admin read" on public.assignment_submissions for select using (public.is_admin());

-- student_ranks
create policy "sr self read" on public.student_ranks for select using (auth.uid() = user_id or public.is_admin());
create policy "sr admin" on public.student_ranks for all using (public.is_admin()) with check (public.is_admin());

-- quizzes / questions / attempts
create policy "quiz read" on public.quizzes for select using (
  public.is_admin() or exists (
    select 1 from public.module_sections s where s.id = quizzes.module_section_id and public.has_access_to_module(s.module_id)
  )
);
create policy "quiz admin" on public.quizzes for all using (public.is_admin()) with check (public.is_admin());
create policy "qq read" on public.quiz_questions for select using (
  exists (select 1 from public.quizzes q where q.id = quiz_questions.quiz_id)
);
create policy "qq admin" on public.quiz_questions for all using (public.is_admin()) with check (public.is_admin());
create policy "qa self" on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "qa admin read" on public.quiz_attempts for select using (public.is_admin());

-- certificates
create policy "cert self read" on public.certificates for select using (auth.uid() = user_id or public.is_admin());
create policy "cert admin" on public.certificates for all using (public.is_admin()) with check (public.is_admin());

-- live_sessions
create policy "live read" on public.live_sessions for select using (public.has_active_subscription() or public.is_admin());
create policy "live admin" on public.live_sessions for all using (public.is_admin()) with check (public.is_admin());

-- forum
create policy "ft read" on public.forum_threads for select using (public.has_active_subscription() or public.is_admin());
create policy "ft write" on public.forum_threads for insert with check (auth.uid() = author_id and public.has_active_subscription());
create policy "ft update" on public.forum_threads for update using (auth.uid() = author_id or public.is_admin());
create policy "fp read" on public.forum_posts for select using (public.has_active_subscription() or public.is_admin());
create policy "fp write" on public.forum_posts for insert with check (auth.uid() = author_id and public.has_active_subscription());
create policy "fp update" on public.forum_posts for update using (auth.uid() = author_id or public.is_admin());

-- ai
create policy "aiconv self" on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "aimsg self" on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = auth.uid()));

-- =====================================================================
-- 22. VERIFICACIÓN
-- =====================================================================
-- select count(*) from public.ranks;            -- 9
-- select count(*) from public.blocks;           -- 9
-- select count(*) from public.modules;          -- 72
-- select count(*) from public.module_sections;  -- 360
-- select course_week, title from public.modules order by course_week;  -- 1..72
-- =====================================================================
