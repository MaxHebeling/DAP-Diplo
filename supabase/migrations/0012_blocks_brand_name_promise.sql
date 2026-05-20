-- =====================================================================
-- DAP — 0012: ADD brand_name + promise en blocks (y phases mirror)
-- =====================================================================
-- Nuevos campos editoriales para mostrar en cards y página de detalle:
--
--   brand_name → título grande (alternativa más comercial al `title`
--                académico). Ej: "Identidad Apostólica" en vez de
--                "Fundamentos Espirituales".
--   promise    → línea de promesa / outcome del bloque. Ej:
--                "Vas a salir sabiendo quién sos y para qué fuiste enviado."
--
-- Se agrega a `blocks` (FK real desde modules) y se espeja en `phases`
-- (que es la que usa el landing por la divergencia histórica de schema).
-- Cuando seedees los textos, hacelo por slug — phases.slug == blocks.slug.
--
-- NO incluye seed: el copy editorial lo decide Max. Para seedear:
--
--   update public.blocks
--     set brand_name = 'Identidad Apostólica',
--         promise = 'Vas a salir sabiendo quién sos y para qué fuiste enviado.'
--     where slug = 'fundamentos-espirituales';
--   update public.phases set ... where slug = 'fundamentos-espirituales';
--
-- (o un script más DRY que copie de blocks → phases vía slug match).
-- =====================================================================

alter table public.blocks
  add column if not exists brand_name text,
  add column if not exists promise text;

alter table public.phases
  add column if not exists brand_name text,
  add column if not exists promise text;
