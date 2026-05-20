# DAP — Checklist de paso a producción real (GO-LIVE)

> Esto es lo que hay que activar/cambiar cuando dejes de estar en modo
> "test interno" y empieces a aceptar **alumnos pagos reales**.

---

## 1. Stripe — pasar de TEST a LIVE

### Stripe Dashboard
- [ ] Toggle arriba-derecha **TEST → LIVE**
- [ ] **Products** → crear "DAP — Diplomado Apostólico Pastoral"
  - Price: **$25 USD**, recurring, **mensual**
  - Copiar el nuevo `price_...` (empieza con `price_`)
- [ ] **Developers → API keys** → copiar:
  - `pk_live_...` (publishable)
  - `sk_live_...` (secret)
- [ ] **Developers → Webhooks** → Add endpoint:
  - URL: `https://www.dapglobal.org/api/webhooks/stripe` (o el dominio LIVE)
  - Events (5): `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
  - Copiar el **Signing secret** (`whsec_...`)

### Vercel (Production environment)
Reemplazar las 4 env vars con los LIVE values:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_DAP_SUBSCRIPTION_PRICE_ID=price_...
```

Comando:
```bash
printf "%s" "pk_live_..." | vercel env rm NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
printf "%s" "pk_live_..." | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# repetir para las otras 3
```

Después: redeploy para que tome los nuevos values.

---

## 2. Limpiar data de testing

```sql
-- Borrar suscripciones fake / test
delete from public.subscriptions where stripe_subscription_id like 'sub_test_%';

-- Borrar users de testing
delete from public.profiles where id in (
  select id from auth.users where email in ('testing.dap@gmail.com', 'embajadormax@amppbr.org')
);
delete from auth.users where email in ('testing.dap@gmail.com', 'embajadormax@amppbr.org');

-- Resetear contador de matrículas si querés empezar desde 00001 real
update public.admission_matricula_counters
  set next = 1
  where year = extract(year from current_date)::int;
```

---

## 3. Dominio + DNS

- [ ] Verificar que `www.dapglobal.org` apunta a Vercel (CNAME)
- [ ] Verificar que `dapglobal.org` redirige a `www.` (apex redirect en Vercel)
- [ ] SSL: Vercel lo provisiona automático con Let's Encrypt
- [ ] Actualizar `NEXT_PUBLIC_APP_URL` en Vercel production a `https://www.dapglobal.org`
- [ ] Verificar que el webhook Stripe apunta al **dominio final** (no `dap-diplo.vercel.app`)

---

## 4. Email — Resend / IMAPforward

- [ ] Verificar que el dominio `dapglobal.org` está validado en Resend (SPF + DKIM)
- [ ] Confirmar que `EMAIL_FROM=DAP <hola@dapglobal.org>` está en Vercel
- [ ] Confirmar que `EMAIL_ADMISSIONS=admisiones@dapglobal.org` está en Vercel
- [ ] Probar que `admisiones@dapglobal.org` recibe (ImprovMX forwarding al inbox real)
- [ ] Test: registrar admisión nueva → llega a `admisiones@`

---

## 5. PWA / Push notifications

- [ ] Verificar 3 env vars en Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [ ] (Opcional) Si querés diferenciar test vs prod, generar nuevas VAPID keys:
  ```bash
  node -e "const w=require('web-push'); const k=w.generateVAPIDKeys(); console.log(k);"
  ```
- [ ] Probar suscripción + push desde `/configuracion` en un dispositivo real

---

## 6. Cron jobs

Verificar en Vercel → Project → Settings → Cron Jobs:

- [ ] `/api/cron/live-reminders` cada 15 min
- [ ] `/api/cron/admission-letters` diario `0 15 * * *` (09:00 San Diego)
- [ ] `/api/cron/close-week` cada hora
- [ ] `/api/cron/week-open-notify` diario `0 12 * * *` (05:00 San Diego)
- [ ] `/api/cron/grade-assignments` cada hora

`CRON_SECRET` debe estar en Vercel production.

---

## 7. Storage buckets en Supabase

- [ ] `consent-letters` (privado, creado)
- [ ] `admission-letters` (privado, creado)
- [ ] `certificates` (privado, creado)
- [ ] `blocks-covers` (creado o opcional — hoy las covers son /public/blocks)
- [ ] Verificar tamaño máximo del bucket (default 50 MB → cambiar si necesitamos PDFs grandes)

---

## 8. Contenido editorial real

- [ ] Revisar/ajustar `brand_name`, `subtitle`, `promise` y `description` de cada bloque desde `/admin/bloques`
- [ ] Refinar el voice manual del Dr. Max desde `/admin/excorrector` con material real
- [ ] Cargar PDFs del DAP en `/admin/tutor/documentos` para el tutor IA
- [ ] Verificar covers de bloques (`/public/blocks/01-raices.png` … `/09-dominio.png`)
- [ ] Subir contenido real a módulos:
  - Video principal vía Mux (cada módulo, sección "Enseñanza")
  - Body markdown de intro / activation / impartation
  - Quiz preguntas para evaluación

---

## 9. Términos / Legal / Email transaccional

- [ ] Verificar `/terminos`, `/privacidad`, `/reembolso` (review legal)
- [ ] Verificar `/contacto` apunta a inbox real
- [ ] OpenGraph image (`/app/opengraph-image.tsx`) carga OK
- [ ] Sitemap (`/sitemap.xml`) y robots.txt funcionando
- [ ] Verificar que `office@rkchurch.com` es el contacto legal correcto

---

## 10. Monitoreo

- [ ] Vercel Analytics activo (gratis tier)
- [ ] Vercel Logs accesible
- [ ] Email setup en Vercel para alerts de deploy fail
- [ ] (Opcional) Sentry o similar para error tracking client-side

---

## 11. Cuentas de prueba que hay que mantener

Después del cleanup, dejar al menos UN user admin con acceso real:
- `maxhebeling@gmail.com` — rol admin (asegurate que tenga password real, no la temporal)

Crear un alumno test PRIVADO para QA continuo (que no aparezca en métricas):
- Algún email tuyo nuevo, marcado `admission_status='approved'`, sin suscripción
- Para probar nuevos cambios sin afectar alumnos reales

---

## 12. Anuncio del lanzamiento

- [ ] Email a la base de la Red Apostólica anunciando que abrió admisiones
- [ ] Posteo en redes (Instagram, Facebook, YouTube)
- [ ] Update website principal (si dapglobal.org tiene otra landing previa)
- [ ] Notificar al equipo de admisiones que va a empezar a recibir solicitudes en `admisiones@dapglobal.org`

---

## 13. Primeras 48h post-lanzamiento

- [ ] Monitorear `vercel logs https://www.dapglobal.org` periódicamente
- [ ] Revisar Supabase → Database → Logs por errores RLS
- [ ] Revisar Stripe Dashboard → Events por webhooks fallidos
- [ ] Estar disponible para responder consultas de admisiones rápido (primer week-of-the-week)
- [ ] Si llegan suscripciones reales: confirmar que `admission_status='approved'` se está disparando correcto via webhook + RPC `approve_admission`

---

## Quick rollback si algo se rompe

```bash
# Volver al deploy anterior
vercel rollback https://dap-diplo.vercel.app

# O cambiar la env de Stripe de vuelta a TEST (mientras debugeas)
printf "%s" "sk_test_..." | vercel env add STRIPE_SECRET_KEY production
# redeploy
```
