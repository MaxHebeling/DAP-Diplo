-- =====================================================================
-- 0023: Argentina marriage registrations
-- =====================================================================
-- Habilita la inscripción especial de matrimonios desde Argentina
-- bajo una sola suscripción Stripe de USD $35/mes que cubre a ambos
-- cónyuges. Cambios:
--
-- 1. profiles gana 3 columnas opcionales: marriage_group_id, spouse_role,
--    province. Permiten queries directas sin joins extra.
--
-- 2. subscriptions: relajamos UNIQUE(stripe_subscription_id) →
--    UNIQUE(stripe_subscription_id, user_id) para que un matrimonio
--    tenga 2 filas (una por cónyuge) apuntando a la misma sub Stripe.
--    Esto preserva TODOS los checks de acceso existentes
--    (subscriptions.user_id = auth.uid()).
--
-- 3. marriage_registrations: tabla nueva que guarda los datos de
--    inscripción inicial (ambos cónyuges) + flags de verificación
--    GeoIP/teléfono/provincia + estado de provisioning del cónyuge 2.
--
-- 4. RLS: cada cónyuge ve solo su propio registro de matrimonio (y
--    admins ven todo).
-- =====================================================================

-- ---- 1. profiles: columnas de matrimonio ----------------------------
alter table public.profiles
  add column if not exists marriage_group_id uuid,
  add column if not exists spouse_role text
    check (spouse_role in ('spouse_1', 'spouse_2')),
  add column if not exists province text;

create index if not exists profiles_marriage_group_idx
  on public.profiles(marriage_group_id)
  where marriage_group_id is not null;

-- ---- 2. subscriptions: composite unique key -------------------------
-- El constraint legacy unique(stripe_subscription_id) bloquea filas
-- duplicadas. Lo reemplazamos por unique(stripe_subscription_id, user_id)
-- para soportar la pareja cónyuge_1 + cónyuge_2 compartiendo una sub.
do $$
declare
  c_name text;
begin
  select conname into c_name
    from pg_constraint
   where conrelid = 'public.subscriptions'::regclass
     and contype  = 'u'
     and pg_get_constraintdef(oid) ilike '%(stripe_subscription_id)%';
  if c_name is not null then
    execute format('alter table public.subscriptions drop constraint %I', c_name);
  end if;
end $$;

create unique index if not exists subscriptions_stripe_sub_user_uniq
  on public.subscriptions(stripe_subscription_id, user_id);

-- ---- 3. marriage_registrations table --------------------------------
create table if not exists public.marriage_registrations (
  id uuid primary key default uuid_generate_v4(),
  marriage_group_id uuid not null default uuid_generate_v4(),

  -- Cónyuge 1 (quien inicia el registro)
  spouse_1_user_id uuid references public.profiles(id) on delete set null,
  spouse_1_full_name text not null,
  spouse_1_email text not null,
  spouse_1_phone text not null,
  spouse_1_province text not null,
  spouse_1_ministry text,

  -- Cónyuge 2 (provisionado tras pago vía webhook)
  spouse_2_user_id uuid references public.profiles(id) on delete set null,
  spouse_2_full_name text not null,
  spouse_2_email text not null,
  spouse_2_phone text not null,
  spouse_2_province text not null,
  spouse_2_ministry text,

  -- Verificación + auditoría anti-abuso
  country text not null default 'Argentina',
  country_code text not null default 'AR',
  geoip_country text,
  declared_residence_in_ar boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified_argentina', 'pending_review', 'rejected')),
  verification_flags jsonb not null default '[]'::jsonb,

  -- Stripe
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  stripe_payment_status text,
  argentina_discount_applied boolean not null default true,
  final_amount_usd numeric(10, 2) not null default 35.00,

  -- Provisioning estado
  spouse_2_provisioned_at timestamptz,
  spouse_2_invite_sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marriage_reg_group_idx
  on public.marriage_registrations(marriage_group_id);
create index if not exists marriage_reg_spouse1_idx
  on public.marriage_registrations(spouse_1_user_id);
create index if not exists marriage_reg_spouse2_idx
  on public.marriage_registrations(spouse_2_user_id);
create index if not exists marriage_reg_sub_idx
  on public.marriage_registrations(stripe_subscription_id);
create index if not exists marriage_reg_verification_idx
  on public.marriage_registrations(verification_status);

create trigger trg_marriage_registrations_updated
  before update on public.marriage_registrations
  for each row execute function public.set_updated_at();

-- ---- 4. RLS -----------------------------------------------------------
alter table public.marriage_registrations enable row level security;

create policy "marriage_reg self read"
  on public.marriage_registrations
  for select
  using (
    auth.uid() = spouse_1_user_id
    or auth.uid() = spouse_2_user_id
    or public.is_admin()
  );

create policy "marriage_reg admin"
  on public.marriage_registrations
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- 5. Comentarios documentales ------------------------------------
comment on table public.marriage_registrations is
  'Inscripciones especiales de matrimonio desde Argentina. Una fila por pareja, con datos de ambos cónyuges. La suscripción Stripe ($35/mes) es única y cubre a los dos vía 2 filas en public.subscriptions con el mismo stripe_subscription_id.';

comment on column public.profiles.marriage_group_id is
  'Si está poblado, el perfil pertenece a una pareja registrada en marriage_registrations. Spouse_role indica si es spouse_1 o spouse_2.';
