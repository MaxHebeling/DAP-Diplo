-- account_auth_hint: ayuda a la pantalla de login a guiar cuentas sin contraseña.
-- Tras un intento de login fallido, el server action consulta qué método de
-- acceso tiene el email para mostrar un mensaje útil en vez del genérico:
--   'google_no_password' → registrada con Google, sin contraseña local
--   'email_no_password'  → email sin contraseña fijada (invitación / magic link)
--   'generic'            → tiene contraseña, o no existe (no se diferencian:
--                          anti-enumeración — "Correo o contraseña incorrectos")
-- Solo ejecutable por service_role (server-side con admin client); nunca cliente.
create or replace function public.account_auth_hint(p_email text)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
  v_pwd text;
  v_has_google boolean;
begin
  select u.id, u.encrypted_password
    into v_id, v_pwd
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;

  if v_id is null then
    return 'generic';            -- no existe → no lo revelamos
  end if;
  if v_pwd is not null and v_pwd <> '' then
    return 'generic';            -- tiene contraseña → "incorrectos" genérico
  end if;

  select exists(
    select 1 from auth.identities i
    where i.user_id = v_id and i.provider = 'google'
  ) into v_has_google;

  if v_has_google then
    return 'google_no_password';
  end if;
  return 'email_no_password';
end;
$$;

revoke all on function public.account_auth_hint(text) from public;
revoke all on function public.account_auth_hint(text) from anon;
revoke all on function public.account_auth_hint(text) from authenticated;
grant execute on function public.account_auth_hint(text) to service_role;
