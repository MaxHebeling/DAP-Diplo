-- =====================================================================
-- DAP — 0003: blindaje de seguridad para admisión
-- =====================================================================
-- Aplicar DESPUÉS de 0001 + 0002 (y de haber creado el bucket
-- consent-letters en el dashboard de Supabase Storage).
--
-- Dos blindajes:
--
--   1. PROFILES: el alumno NO puede mutar columnas sensibles desde el
--      cliente. La policy "profiles self update" sigue activa, pero el
--      column-level GRANT solo le da UPDATE a campos cosméticos. Las
--      columnas críticas (admission_status, role, matricula,
--      current_rank_id, program_start_date) solo se cambian via
--      service-role (server actions + crons + admin).
--
--   2. STORAGE.consent-letters: el alumno solo puede subir y leer
--      archivos dentro de su carpeta {user_id}/. No puede ver ni
--      escribir en carpetas de otros usuarios. Admin lee todo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES — column-level grant restrictivo
-- ---------------------------------------------------------------------
-- Quita el UPDATE table-wide y vuelve a otorgarlo solo sobre las
-- columnas seguras. Sin esto, RLS (auth.uid() = id) dejaría al alumno
-- cambiar cualquier columna en su propia fila — incluyendo el
-- admission_status (auto-aprobarse). Con esto, ni siquiera puede
-- intentarlo: el GRANT lo rechaza antes de llegar a la policy.

revoke update on public.profiles from authenticated;

grant update (full_name, ministry_name, country, phone, avatar_url)
  on public.profiles to authenticated;

-- Las siguientes columnas quedan EXCLUSIVAMENTE para service-role:
--   id, role, current_rank_id, program_start_date, matricula,
--   admission_status, created_at, updated_at.
--
-- El service-role (usado por server actions y webhooks vía
-- createAdminClient) bypasea RLS y column grants, así que sí puede
-- mutarlas. Esa es la única vía legítima.

-- ---------------------------------------------------------------------
-- 2. STORAGE policies para bucket "consent-letters"
-- ---------------------------------------------------------------------
-- El bucket debe existir antes (creado manualmente en Supabase Studio
-- como privado). Path esperado: {user_id}/{filename}.
--
-- Limpia policies viejas con el mismo nombre por si se re-corre.
drop policy if exists "consent-letters: alumno sube en su carpeta"
  on storage.objects;
drop policy if exists "consent-letters: alumno lee lo suyo"
  on storage.objects;
drop policy if exists "consent-letters: admin lee todo"
  on storage.objects;

-- Alumno autenticado puede INSERTAR (upload) solo en su carpeta.
create policy "consent-letters: alumno sube en su carpeta"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'consent-letters'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Alumno autenticado puede LEER solo sus archivos (para generar
-- signed URLs si quisiera verificar su upload).
create policy "consent-letters: alumno lee lo suyo"
on storage.objects for select
to authenticated
using (
  bucket_id = 'consent-letters'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin puede leer todos los archivos del bucket (panel de admisiones
-- los va a previsualizar via signed URL generada server-side).
create policy "consent-letters: admin lee todo"
on storage.objects for select
to authenticated
using (
  bucket_id = 'consent-letters'
  and public.is_admin()
);

-- NO se le da UPDATE ni DELETE al alumno: la carta de consentimiento
-- es evidencia y no debe poder borrarla. Si necesita reemplazarla, el
-- admin la rechaza y el alumno re-postula creando una admisión nueva
-- con un path nuevo (timestamp).

-- ---------------------------------------------------------------------
-- 3. Verificación
-- ---------------------------------------------------------------------
-- Como alumno autenticado (en SQL Editor con role authenticated):
--   update public.profiles set admission_status='approved' where id=auth.uid();
--   → ERROR: permission denied for column admission_status
--
-- Como service_role:
--   update public.profiles set admission_status='approved' where id='<uuid>';
--   → OK
-- =====================================================================
