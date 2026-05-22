# Pre-launch checklist — DAP (01 Jun 2026)

> Ejecutar el día anterior (31 May) y de nuevo en la mañana del 01 Jun, 1h antes de abrir inscripciones.
> Cada item es **PASS / FAIL**. Si algo es FAIL, NO abrir hasta resolverlo.

---

## 0. Pre-deploy verification

- [ ] Branch `main` está al día con todo lo que va a producción (`git status` limpio, `git log --oneline -5` muestra el último commit esperado)
- [ ] Última corrida de **CI** verde: https://github.com/MaxHebeling/DAP-Diplo/actions
- [ ] **`pnpm test:e2e` local** pasa contra prod: 7+ tests verdes
- [ ] **`pnpm lhci`** pasa contra prod: no falla por thresholds
- [ ] **`pnpm build` local** PASS sin warnings nuevos
- [ ] **`pnpm audit --prod`** = 0 CVEs

---

## 1. Env vars en Vercel production

`vercel env ls production` debe mostrar TODAS estas con valor real (no placeholder):

### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` → `https://udrzhoswelxrosznxawe.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Stripe **(modo LIVE, no test)**
- [ ] `STRIPE_SECRET_KEY` → empieza con `sk_live_` (NO `sk_test_`)
- [ ] `STRIPE_WEBHOOK_SECRET` → del endpoint `/api/webhooks/stripe` LIVE
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → empieza con `pk_live_`
- [ ] `STRIPE_DAP_SUBSCRIPTION_PRICE_ID` → price de $25/mes en LIVE mode (NO el de test)

### Mux
- [ ] `MUX_TOKEN_ID` + `MUX_TOKEN_SECRET` (access token, no signing key)
- [ ] `MUX_WEBHOOK_SECRET`
- [ ] `MUX_SIGNING_KEY` (key ID, ~44 chars)
- [ ] `MUX_PRIVATE_KEY` (base64 PEM, ~2000 chars)

### Email
- [ ] `RESEND_API_KEY` → empieza con `re_`
- [ ] `EMAIL_FROM` = `DAP <office@dapglobal.org>`
- [ ] `EMAIL_ADMISSIONS` = `admisiones@dapglobal.org`
- [ ] **Dominio `dapglobal.org` verificado en Resend** (SPF + DKIM + DMARC todos green)

### App
- [ ] `NEXT_PUBLIC_APP_URL` = `https://www.dapglobal.org` (NO `dap-diplo.vercel.app`)
- [ ] `ANTHROPIC_API_KEY` (para Tutor IA + excorrector)
- [ ] `CRON_SECRET` (al menos 32 chars random)
- [ ] `VOYAGE_API_KEY` (para embeddings del Tutor)
- [ ] `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` (push notifications)

### Sentry
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_ORG` = `ikingdom-llc`
- [ ] `SENTRY_PROJECT` = `javascript-nextjs`
- [ ] `SENTRY_AUTH_TOKEN` (para source maps legibles)

---

## 2. Webhooks externos apuntan a prod

### Stripe Dashboard → Developers → Webhooks
- [ ] Endpoint `https://www.dapglobal.org/api/webhooks/stripe` está creado y **enabled** en LIVE mode
- [ ] Events seleccionados:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.paid`
  - [ ] `invoice.payment_failed`
  - [ ] `charge.refunded`
- [ ] El `STRIPE_WEBHOOK_SECRET` en Vercel matchea el que muestra Stripe Dashboard

### Mux Dashboard → Settings → Webhooks
- [ ] Endpoint `https://www.dapglobal.org/api/webhooks/mux` activo
- [ ] Events: `video.upload.asset_created`, `video.asset.ready`, `video.asset.errored`
- [ ] El `MUX_WEBHOOK_SECRET` en Vercel matchea

---

## 3. Sistema de admisión funcional (camino completo)

Hacer un signup de prueba con tu cuenta de email personal alternativa:

- [ ] Abrir `https://www.dapglobal.org/signup` → muestra el form (`isEnrollmentOpen()` devuelve `true`)
- [ ] Completar form de admisión real (con datos truchos pero plausibles)
- [ ] Recibir email de confirmación en INBOX (NO spam) del admin
- [ ] Aprobar la admisión desde `/admin/admisiones`
- [ ] 24h después: ¿llegó la carta PDF de admisión al email del aspirante? (test del cron)

> Si no podés esperar 24h: invocar el cron manual con `curl -H "Authorization: Bearer $CRON_SECRET" https://www.dapglobal.org/api/cron/admission-letters`

---

## 4. Stripe checkout end-to-end (con tarjeta REAL — luego refund)

- [ ] Usar el signup aprobado del paso 3
- [ ] Ir a `/suscribirme` → click "Comenzar"
- [ ] Stripe Checkout muestra precio $25/mes, currency USD
- [ ] Pagar con tarjeta real (la tuya)
- [ ] Tras success: redirect a `/dashboard` correctamente
- [ ] En Stripe Dashboard: ver la subscription creada con `customer.metadata.userId = <tu uuid>`
- [ ] En Supabase: tabla `subscriptions` tiene fila con `status='active'` + `stripe_customer_id` + `stripe_subscription_id`
- [ ] Email de bienvenida llegó al INBOX
- [ ] **Refund completo desde Stripe Dashboard** → confirmar que `charge.refunded` webhook llega y la subscription pasa a `canceled` (acceso revocado al instante)

---

## 5. Mux upload + signed playback

- [ ] Como admin, ir a `/admin/fases/.../modulos/.../secciones/teaching/editar`
- [ ] Subir un video pequeño (10-30s) via Mux Uploader
- [ ] Esperar el webhook (15-60s)
- [ ] En Supabase `module_sections`: `mux_asset_id` y `mux_playback_id` populados
- [ ] **Confirmar en Mux Dashboard**: el asset tiene `playback_policies: ["signed"]` (NO `public`)
- [ ] Ir a `/fases/.../modulos/...` como alumno aprobado → el video reproduce
- [ ] Inspeccionar Network: la URL del segmento HLS tiene `?token=eyJ...` (JWT signed)
- [ ] **Test edge case**: copiar el `mux_playback_id` y abrir `https://stream.mux.com/<ID>.m3u8` en otra pestaña → debe devolver **403 forbidden** (porque no hay token)

---

## 6. Sentry capturando

- [ ] https://ikingdom-llc.sentry.io/issues → ver issues recientes (probablemente vacío si no hay errores)
- [ ] Alerta "New issue created" → activa (verde)
- [ ] Test rápido: editar un endpoint, agregar `throw new Error("test pre-launch")`, deploy, hit, ver el issue en Sentry, revertir y re-deploy

---

## 7. Observability dashboards listos

- [ ] Vercel Analytics: https://vercel.com/max-ab784c70/dap-diplo/analytics → muestra datos del último día
- [ ] Vercel Speed Insights: https://vercel.com/max-ab784c70/dap-diplo/speed-insights → tabla con Core Web Vitals
- [ ] Sentry dashboard de la org abierto en pestaña permanente

---

## 8. SEO + crawling

- [ ] `https://www.dapglobal.org/sitemap.xml` carga y contiene `/` + `/como-funciona` + `/rangos` + las 9 fases publicadas
- [ ] `https://www.dapglobal.org/robots.txt` muestra `Allow: /` y `Disallow:` con `/admin/`, `/api/`, `/dashboard`, etc.
- [ ] **Google Search Console** → property `dapglobal.org` verificada, sitemap submitted (https://search.google.com/search-console)
- [ ] Test rich results en https://search.google.com/test/rich-results?url=https%3A%2F%2Fwww.dapglobal.org → Course + Organization + FAQPage detectados

---

## 9. Comunicación de launch

- [ ] Email de "Inscripciones abiertas" preparado en Resend (template + tone)
- [ ] Lista de pastores de Red Apostólica importada en una audiencia
- [ ] Banner/post de redes preparado con OG image dinámica
- [ ] Hora exacta de "go live" definida (ej: 09:00 hora México)
- [ ] Plan de fallback si algo falla: link a `status.dapglobal.org` o "estamos resolviéndolo, vuelve en 1h"

---

## 10. Roll-back plan

Si el día del launch algo se rompe gravemente:

```bash
# Ver últimos deploys
vercel ls --prod

# Rollback al deploy anterior (instantáneo, sin rebuild)
vercel rollback <deployment-url-anterior>
```

- [ ] Tenés acceso a la cuenta de Vercel desde mobile
- [ ] Tenés Sentry abierto en mobile también (para monitorear desde el celular)
- [ ] Bloqueás 4h del día 01 Jun para estar disponible

---

## 11. Mux signing key vieja revocada

- [ ] La signing key vieja (que se compartió en chat el 21 May) está **REVOKED** en https://dashboard.mux.com/settings/signing-keys
- [ ] Solo queda activa la key generada después

---

## Día del launch — minute-by-minute

| T-1h | Refrescar este checklist completo |
| T-30m | Tener Sentry, Vercel Analytics y Vercel Logs abiertos |
| T-15m | Confirmar 0 issues abiertos en Sentry |
| **T-0** | Mandar email/post de "Inscripciones abiertas" |
| T+5m | Verificar primer signup orgánico (alguien real registrándose) |
| T+15m | Sin errores nuevos en Sentry, métricas normales |
| T+1h | Primer review: signups acumulados, errores, performance |
| T+4h | Mid-day check |
| T+24h | Post-launch retrospectiva — qué se rompió, qué no |
