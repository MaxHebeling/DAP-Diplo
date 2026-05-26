-- =====================================================================
-- 0027: module_sections.captions + captions_job_id
-- Para soportar traducciones multi-idioma vía Polyglot AI.
-- captions: { "es": "vtt_url", "en": "vtt_url", "pt": "vtt_url", ... }
-- captions_job_id: jobId que Polyglot AI devolvió, para troubleshooting.
-- =====================================================================

alter table public.module_sections
  add column if not exists captions jsonb not null default '{}'::jsonb;

alter table public.module_sections
  add column if not exists captions_job_id text;

comment on column public.module_sections.captions is
  'Mapa de idioma → URL VTT pública. Mux también recibe las pistas attached vía createTrack.';
comment on column public.module_sections.captions_job_id is
  'ID del job de Polyglot AI que generó las traducciones (para debug).';
