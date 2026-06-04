-- Anotaciones del admin sobre la entrega de un alumno.
--
-- Sirven para "corregir a mano" en la review queue:
--  - target='text': highlight/strike/comment sobre rango del content_text
--  - target='attachment': box (con comentario opcional) sobre coordenadas
--    normalizadas 0..1 de una imagen JPG/PNG/WebP adjunta
--
-- Se guardan apenas el admin las dibuja (no esperan al approve). El
-- alumno solo las ve cuando la submission tiene results_sent_at != null
-- (RLS lo enforcea via join).

create table public.submission_annotations (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null
    references public.assignment_submissions(id) on delete cascade,

  target text not null check (target in ('text', 'attachment')),
  kind text not null check (kind in ('highlight', 'strike', 'comment', 'box')),

  -- target='text': offsets sobre content_text (codepoint count en JS)
  text_start integer,
  text_end integer,

  -- target='attachment': coords normalizadas 0..1
  rect_x numeric(8, 6),
  rect_y numeric(8, 6),
  rect_w numeric(8, 6),
  rect_h numeric(8, 6),

  color text not null default 'yellow'
    check (color in ('yellow', 'red', 'blue', 'green')),
  comment text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Consistencia: text-targets requieren offsets; attachment-targets requieren rect
  constraint text_offsets_when_text check (
    target <> 'text'
    or (text_start is not null and text_end is not null and text_end > text_start)
  ),
  constraint rect_when_attachment check (
    target <> 'attachment'
    or (rect_x is not null and rect_y is not null and rect_w is not null and rect_h is not null)
  )
);

create index submission_annotations_submission_idx
  on public.submission_annotations (submission_id);

-- updated_at trigger (reusa la fn estándar del proyecto si existe)
create or replace function public.tg_submission_annotations_touch()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger submission_annotations_touch
  before update on public.submission_annotations
  for each row execute function public.tg_submission_annotations_touch();

-- RLS
alter table public.submission_annotations enable row level security;

-- Alumno: solo lee anotaciones de SUS submissions Y solo después de que
-- el admin las aprobó (results_sent_at no nulo).
create policy "alumno lee anotaciones de sus submissions aprobadas"
  on public.submission_annotations
  for select
  using (
    exists (
      select 1
      from public.assignment_submissions s
      where s.id = submission_id
        and s.user_id = auth.uid()
        and s.results_sent_at is not null
    )
  );

-- Admin: lectura/escritura total. Usamos el patrón role='admin' del proyecto.
create policy "admin lee todas las anotaciones"
  on public.submission_annotations
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admin escribe anotaciones"
  on public.submission_annotations
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admin actualiza anotaciones"
  on public.submission_annotations
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "admin borra anotaciones"
  on public.submission_annotations
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
