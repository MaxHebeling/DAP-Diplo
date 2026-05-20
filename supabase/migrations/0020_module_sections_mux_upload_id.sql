-- mux_upload_id se setea en app/api/mux/create-upload/route.ts y se usa
-- como fallback de lookup en el webhook (cuando passthrough no llega).
-- Faltaba la columna en la DB; el upload fallaba silenciosamente al
-- intentar persistirlo.

alter table public.module_sections
  add column if not exists mux_upload_id text;

create index if not exists module_sections_mux_upload_id_idx
  on public.module_sections (mux_upload_id)
  where mux_upload_id is not null;
