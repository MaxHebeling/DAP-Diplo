-- Habilita Realtime para visit_logs y leads
-- para que el panel admin pueda mostrar visitas/leads en vivo.
alter publication supabase_realtime add table public.visit_logs;
alter publication supabase_realtime add table public.leads;
