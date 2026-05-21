-- =====================================================================
-- 0021: handle_new_user — soporte para Google OAuth
-- =====================================================================
-- Cuando un usuario se registra con Google, Supabase guarda los datos
-- del provider en raw_user_meta_data con las keys de Google:
--   - name           (full name)
--   - picture        (avatar URL)
--   - email
-- En cambio el signup tradicional usa:
--   - full_name      (lo que mandamos desde signUpAction)
--   - ministry_name  (lo que mandamos desde signUpAction)
--   - country        (lo que mandamos desde signUpAction)
--
-- Esta migration actualiza el trigger para que ambos flujos creen
-- el profile correctamente: full_name cae de full_name → name → email,
-- y avatar_url se intenta de avatar_url → picture (la key que usa Google).
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, ministry_name, country, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email
    ),
    new.raw_user_meta_data->>'ministry_name',
    new.raw_user_meta_data->>'country',
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$;
