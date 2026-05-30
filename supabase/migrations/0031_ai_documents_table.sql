-- =====================================================================
-- DAP — Migration 0031: re-crear ai_documents (chunks + embeddings)
-- =====================================================================
-- La migration 0001 consolidada dropea `ai_documents` y nunca la
-- vuelve a crear. La función match_documents (definida en otra
-- migration) y el pipeline lib/tutor/ingest.ts esperan que exista
-- con esquema {id, source_id, source_title, source_kind, chunk_text,
-- chunk_index, embedding vector(1024), metadata, created_at}.
--
-- Sin esta tabla el Tutor IA no puede ingestar ningún PDF.
-- =====================================================================

create table if not exists public.ai_documents (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references public.ai_document_sources(id) on delete cascade,
  source_title text not null,
  source_kind text not null check (source_kind in ('pdf', 'audio_transcript', 'manual')),
  chunk_index int not null,
  chunk_text text not null,
  embedding extensions.vector(1024),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_documents_source_idx
  on public.ai_documents(source_id, chunk_index);

-- HNSW para cosine similarity. m=16, ef_construction=64 (defaults
-- balanceados para corpus chico-medio del DAP, <100k chunks).
create index if not exists ai_documents_embedding_idx
  on public.ai_documents
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.ai_documents enable row level security;

-- Solo admin lee (estudiantes acceden vía match_documents SECURITY DEFINER).
drop policy if exists "ai_documents admin read" on public.ai_documents;
create policy "ai_documents admin read"
  on public.ai_documents for select
  using (public.is_admin());

drop policy if exists "ai_documents admin write" on public.ai_documents;
create policy "ai_documents admin write"
  on public.ai_documents for all
  using (public.is_admin())
  with check (public.is_admin());
