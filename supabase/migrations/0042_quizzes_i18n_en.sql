-- =====================================================================
-- DAP — 0042: columnas _en para quizzes y quiz_questions (i18n)
-- =====================================================================
-- La migration 0028 agregó _en a blocks/phases/modules/module_sections,
-- pero olvidó quizzes y quiz_questions. Sin estas columnas la app no
-- puede mostrar las evaluaciones en inglés.
--
-- Aditiva nullable — ADD COLUMN nullable es instantáneo en Postgres y
-- no toca datos existentes. La app cae al español si _en es null vía
-- lib/i18n/localized.ts (mismo patrón que módulos).
--
-- quiz_questions.payload es jsonb y contiene las opciones de respuesta
-- (multiple_choice: { options: [...], correct_index: N }). El payload_en
-- replica la estructura pero con las opciones traducidas.
-- =====================================================================

alter table public.quizzes
  add column if not exists title_en text,
  add column if not exists description_en text;

alter table public.quiz_questions
  add column if not exists prompt_en text,
  add column if not exists payload_en jsonb,
  add column if not exists explanation_en text;

-- comentarios para futuros agentes / docs autogenerados
comment on column public.quizzes.title_en is
  'EN translation of title. Falls back to ES if NULL (see lib/i18n/localized.ts).';
comment on column public.quiz_questions.payload_en is
  'EN translation of payload. Same shape as payload (options, correct_index). NULL = fall back to ES.';
