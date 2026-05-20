-- =====================================================================
-- DAP — 0010: TZ del programa America/Mexico_City → America/Los_Angeles
-- =====================================================================
-- Decisión del producto: San Diego, CA es la sede operativa de
-- Revival & Kingdom Ministries, INC y la base del Ap. Max Hebeling.
-- Toda la lógica de semanas (martes 00:01 → lunes 23:59) se calcula
-- en esta TZ.
--
-- Seguridad: aplicado cuando 0 alumnos tenían program_start_date, por
-- lo que el cambio no afecta cálculos de current_program_week ya
-- activos. Si en el futuro se quiere mover la TZ a otra, se debe
-- coordinar con el ciclo activo de los alumnos (pueden ver su semana
-- cambiar por 1 día si el cambio cae cerca del martes).
-- =====================================================================

create or replace function public.dap_tz()
returns text language sql immutable as $$
  select 'America/Los_Angeles'::text;
$$;

comment on function public.dap_tz() is
  'Timezone del programa DAP. Toda lógica de semanas (martes 00:01 → lunes 23:59) se calcula en esta TZ. America/Los_Angeles = San Diego, CA (sede de Revival & Kingdom Ministries).';

notify pgrst, 'reload schema';
