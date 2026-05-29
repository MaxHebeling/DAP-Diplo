-- Soporte multi-idioma para recursos del módulo (PDFs en ES y EN).
-- Default 'es' para no romper los rows existentes.
alter table public.module_resources
  add column if not exists locale text not null default 'es'
  check (locale in ('es', 'en'));

-- Index para queries del player (filtra por module_id + locale).
create index if not exists idx_module_resources_module_locale
  on public.module_resources(module_id, locale);
