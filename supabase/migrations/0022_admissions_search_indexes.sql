-- Indexes para acelerar la búsqueda con ILIKE de la página admin de
-- admisiones (`.or(full_name.ilike, email.ilike, church_name.ilike)`).
-- Sin estos, cada búsqueda hace Seq Scan completo de la tabla; con
-- cientos de admisiones se vuelve lento.
--
-- pg_trgm + GIN soporta ILIKE %x% eficientemente.

create extension if not exists pg_trgm with schema extensions;

create index if not exists admissions_full_name_trgm_idx
  on public.admissions using gin (full_name extensions.gin_trgm_ops);

create index if not exists admissions_email_trgm_idx
  on public.admissions using gin (email extensions.gin_trgm_ops);

create index if not exists admissions_church_name_trgm_idx
  on public.admissions using gin (church_name extensions.gin_trgm_ops)
  where church_name is not null;
