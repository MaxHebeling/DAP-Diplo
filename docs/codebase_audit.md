# DAP-Diplo — Auditoría Total del Codebase

**Fecha:** 2026-05-20
**Auditor:** Claude Code (8 agentes paralelos, enfoque pragmático)
**Stack:** Next 16.2.6 · React 19.2.4 · Supabase · Stripe · Mux · pnpm
**Producción:** dap-diplo.vercel.app
**Alcance:** seguridad, build/types, RLS, pagos, video, deps, performance, dead code

---

## Resumen ejecutivo

**Score global ponderado: 7.2 / 10**

El proyecto está **bien arquitectado en su mayor parte**: build pasa, Stripe está implementado de forma robusta, RLS habilitado en todas las tablas, sin secretos hardcodeados, sin XSS, sin `select('*')`, defensa en profundidad en endpoints sensibles. Sin embargo, hay **3 bugs CRÍTICOS que bloquean producción de forma efectiva** y un grupo de HIGH que conviene cerrar antes de escalar usuarios.

### El blocker más urgente

> **🚨 REVENUE LEAK — Videos pagados servidos como `public` en Mux.**
> Cualquier persona con el `playback_id` puede ver el contenido sin pagar la suscripción de $25/mes. Anula todo el gating de Stripe + RLS. **Hay que arreglarlo antes de hacer marketing.**

### Distribución de hallazgos

| Severidad | Total | Áreas afectadas |
|-----------|------:|-----------------|
| 🔴 CRITICAL | **3** | Mux (×2), Supabase (×1) |
| 🟠 HIGH | **11** | Mux ×3, Supabase ×3, Build ×3, Performance ×4, Deps ×1 |
| 🟡 MEDIUM | **27** | Performance ×7, Supabase ×5, Security ×4, Stripe ×2, Mux ×3, Deps ×4, Dead code (landing) ×9, Build ×2 |
| 🔵 LOW | **36** | Dispersos |

### Score por área

| Área | Score | Top hallazgo |
|------|------:|--------------|
| 🟢 Stripe / Pagos | **9.0** | Idempotency race window (MED) |
| 🟢 Dead code & Principles | **8.5** | 9 componentes huérfanos en `components/landing/` |
| 🟢 Supabase / RLS | **8.0** | **RPC `verify_certificate` sin migración (CRIT)** |
| 🟡 Seguridad | **7.5** | Falta CSP/HSTS en `next.config.ts` |
| 🟡 Build / TS / Lint | **7.5** | 19 ESLint errors, build pasa |
| 🟡 Performance | **7.2** | 3 cron jobs con N+1 que escala mal >100 alumnos |
| 🟡 Dependencies | **7.0** | `three@0.149` (35 minors atrás), 1 CVE postcss |
| 🔴 Mux / Video | **3.0** | **playback_policies: ["public"] → revenue leak (CRIT)** |

---

## 🔥 TOP 5 — Arreglar antes que nada

| # | Sev | Área | Issue | Esfuerzo |
|---|-----|------|-------|----------|
| 1 | 🔴 CRIT | Mux | `playback_policies: ["public"]` en `app/api/mux/create-upload/route.ts:64` + playback_id crudo al cliente en `components/module/section-teaching.tsx:75`. Cualquiera con el ID ve el contenido pagado. | 3-4 h (crear `lib/mux/playback.ts` con JWT signing, migrar) |
| 2 | 🔴 CRIT | Supabase | RPC `verify_certificate` invocada en `app/(public)/verificar/[code]/page.tsx:62` pero **NO existe en migraciones**. Un reset de DB rompe verificación pública de certificados. | 20 min (crear migración versionada con `SECURITY DEFINER`) |
| 3 | 🔴 CRIT | Mux | Cleanup de assets ausente: cada re-upload de sección deja huérfano el anterior en Mux. Cost leak creciente. | 1 h (hook on update/delete de `module_sections`) |
| 4 | 🟠 HIGH | Seguridad | `cors_origin: req.headers.get("origin") ?? "*"` en `app/api/mux/create-upload/route.ts:60`. Fallback a `*` permite uploads desde cualquier origen. | 10 min |
| 5 | 🟠 HIGH | Supabase | Storage buckets `ai-documents` y `certificates` **sin policies versionadas**. Si están abiertos, cualquier authenticated lee/escribe. | 30 min (verificar en dashboard + migración) |

---

## 1. Seguridad — 7.5/10

**0 CRITICAL · 0 HIGH · 4 MEDIUM · 4 LOW**

### Findings

| Sev | File:Line | Issue | Fix |
|-----|-----------|-------|-----|
| MED | `next.config.ts:1-21` | No define `headers()` con CSP, HSTS, X-Frame-Options. Sitio en prod sin security headers. | Agregar `async headers()` con CSP estricta (Mux/Supabase/Stripe allowlist), HSTS, `X-Frame-Options: DENY`. |
| MED | `app/api/mux/create-upload/route.ts:60-63` | `cors_origin ?? "*"` — refleja `Origin` sin validar. | Allowlist explícita; nunca `*`. |
| MED | `app/api/cron/*/route.ts` (×5) | Si `CRON_SECRET` no está seteado en preview, deja pasar sin auth → gasto Claude/Resend. | Falla cerrada: `if (!expected) return false`. |
| MED | `app/api/admin/tutor/upload-url/route.ts:11-15` | Path validado por regex pero sin prefix por user; admin puede sobrescribir rutas raíz del bucket. | Forzar `${user.id}/${uuid}-${path}` server-side. |
| LOW | `app/api/checkout/.../route.ts:86`, `app/api/billing/portal/route.ts:52` | Fallback `new URL(request.url).origin` para `appUrl`. | Exigir `NEXT_PUBLIC_APP_URL` en runtime. |
| LOW | `app/api/admin/push-test/route.ts:14-17` | Acepta cualquier URL como destino push. | Validar que empiece con `/` o `NEXT_PUBLIC_APP_URL`. |
| LOW | `lib/supabase/middleware.ts:46-58` | Cookies delegadas al SDK; confirmar `secure=true` en prod. | Inspeccionar set-cookie; override si SDK no lo setea. |
| LOW | `app/api/quizzes/[quizId]/submit/route.ts:18-22` | Sin cap en cantidad de answers. | `z.record(...).refine(o => Object.keys(o).length <= 100)`. |

### Lo que pasó limpio

- 0 secretos hardcodeados (grep `sk_live_/sk_test_/SUPABASE_SERVICE_ROLE`: 0 hits)
- 0 endpoints sensibles sin auth
- Webhooks Stripe + Mux con firma verificada
- 0 XSS (`dangerouslySetInnerHTML` solo en JSON-LD escapado)
- Open redirects bloqueados (`safeRedirectTo`, `sanitizeNext`)
- Service role encapsulado en `lib/supabase/admin.ts`, nunca en cliente
- Zod schemas en todos los endpoints con body

---

## 2. Build / TypeScript / Lint — 7.5/10

**Build: PASS · 0 TS errors · 19 ESLint errors · 30 warnings**

| Métrica | Resultado |
|---|---|
| `next build` (Turbopack) | ✅ PASS (4.7s) |
| `tsc --noEmit` | ✅ 0 errores |
| `pnpm lint` | ❌ 19 errores + 30 warnings (exit 1) |
| `// @ts-expect-error` | 1 (justificado, iOS) |
| `: any` explícito en `lib/` `app/api/` | 0 |
| Imports `@/...` rotos | 0 |
| Pages Router legacy | 0 |

### Findings principales

| Sev | File:Line | Issue | Fix |
|-----|-----------|-------|-----|
| HIGH | `app/(public)/cache-clear/cache-clear-client.tsx:34` | `setStepStatus` accedido en `useEffect` antes de declararse (TDZ). | Mover declaración o `useCallback`. |
| HIGH | `components/landing/konami-easter-egg.tsx:40-42`, `components/landing/reveal.tsx:25` | `Math.random()` dentro de `useMemo` (React 19: impuro). | `useState(() => ...)` o `useEffect`. |
| HIGH | `components/layouts/dap-student-shell.tsx:107`, `components/pwa/push-subscribe-button.tsx:31` | `setState` síncrono en `useEffect`. | Derivar inline o handler. |
| MED | `app/(public)/como-funduciona/page.tsx:305`, `app/dev/components/page.tsx:335` | Comillas sin escapar. | `&quot;` / `&ldquo;`. |
| MED | `lib/admission/generate-letter.tsx:236-237,302` | `<Image>` sin `alt`. | `alt=""` decorativo. |
| LOW | Varios forms con react-hook-form | React Compiler omite memoización por `watch()`. | Migrar a `useWatch({ control })`. |
| LOW | Múltiples | Variables/imports no usados. | Borrar o prefijo `_`. |

### Recomendación
Bloquear deploy con `eslint` en CI antes de que crezca el set de warnings (Next 16 + Turbopack no falla el build por ESLint).

---

## 3. Supabase / RLS / Database — 8.0/10

**1 CRITICAL · 3 HIGH · 5 MEDIUM · 3 LOW**

| Sev | File:Line | Issue | Fix |
|-----|-----------|-------|-----|
| 🔴 CRIT | `app/(public)/verificar/[code]/page.tsx:62` | RPC `verify_certificate` invocada pero **NO existe en `supabase/migrations/`**. Aplicada manual/MCP, sin versionar. Un reset rompe verificación pública. | Crear `00XX_verify_certificate.sql` con `SECURITY DEFINER`, `set search_path = public`, grant a `anon, authenticated`. |
| HIGH | `app/(public)/verificar/[code]/page.tsx:67` | `reason={error.message}` se pinta al usuario → filtra detalles de Postgres. | Mensaje genérico al usuario, `console.error` el detalle. |
| HIGH | Storage `ai-documents` (`lib/tutor/ingest.ts`) | **Sin policies versionadas** en migraciones. | Migración con `bucket_id='ai-documents' and is_admin()`. |
| HIGH | Storage `certificates` (`lib/certificates/upload.ts:3`) | Sin policies versionadas. | Policy `foldername[1]=auth.uid()::text` para owner + admin all + write service_role. |
| MED | `0001_consolidated.sql:91-94` | `set_updated_at()` trigger SIN `set search_path`. | Añadir `set search_path = public`. |
| MED | `0009_modules_phase_id_repair.sql:19` | Tabla `phases` referenciada pero NO en `0001`. | Reescribir `0001` para incluir `phases`. |
| MED | `0001_consolidated.sql:774` | `ranks for select using (true)` — policy permisiva. | Documentar `-- catálogo público intencional`. |
| MED | `0001_consolidated.sql:842-844` | `qq read`: cualquier authenticated lee TODAS las preguntas con saber `quiz_id`. | Validar acceso al módulo via `has_access_to_module`. |
| MED | `0011_publish_blocks_and_phases_read_policy.sql` | `blocks.published=true` en bulk pierde gate de draft. | Default `published=false`. |
| LOW | `lib/supabase/admin.ts:9` | `createAdminClient()` sin caché. | Cachear módulo-level. |
| LOW | `app/api/webhooks/mux/route.ts:85,131` | `error.message` en JSON response. | Genérico al cliente, log detalle. |

### Lo que pasó limpio

- 21/21 tablas `public.*` con RLS habilitado
- Trigger `handle_new_user` en `auth.users` **TIENE `set search_path = public`** ✅
- TODAS las funciones `SECURITY DEFINER` revisadas con `set search_path`
- `service_role` solo en API routes (15 archivos), nunca en componentes cliente
- `approve_admission`/`reject_admission` validan `is_admin()` antes de mutar
- Defensa en profundidad: column-level REVOKE en `profiles` para evitar auto-aprobación
- Bucket `consent-letters` con policies correctas por carpeta

---

## 4. Stripe / Pagos — 9.0/10

**0 CRITICAL · 0 HIGH · 2 MEDIUM · 3 LOW**

| Sev | File:Line | Issue | Fix |
|-----|-----------|-------|-----|
| MED | `app/api/webhooks/stripe/route.ts:49-59` + `:110-117` | **Idempotency race window**: check `select` y `insert` separados. Dos webhooks paralelos pueden pasar el check y ejecutar handlers (welcome email duplicado). | `INSERT ... ON CONFLICT DO NOTHING RETURNING id` al inicio; skipear si no devuelve fila. |
| MED | `app/api/webhooks/stripe/route.ts:166-212` | Race en upsert de subscriptions: orden no garantizado, evento viejo puede pisar uno nuevo. | Comparar `event.created` o `updated_at`. |
| LOW | `lib/stripe/api.ts:1-159` + `lib/stripe/server.ts` | Dos clientes Stripe (fetch directo + SDK). Riesgo: futuras llamadas heredan defaults problemáticos. | Consolidar o documentar en CLAUDE.md. |
| LOW | Eventos no manejados: `charge.refunded`, `customer.subscription.trial_will_end`, `invoice.upcoming` | Si admin refunda desde dashboard, usuario sigue marcado active hasta `subscription.deleted`. | Añadir handler `charge.refunded`. |
| LOW | `app/api/webhooks/stripe/route.ts:284-289` | `throw new Error('Subscription X no existe...')` filtra IDs internos en logs. | Mensaje genérico al cliente. |

### Lo que pasó limpio

- ✅ `httpClient: Stripe.createFetchHttpClient()` en `lib/stripe/server.ts:24`
- ✅ Raw body en webhook (`await request.text()` antes de `constructEvent`)
- ✅ Idempotencia via tabla `stripe_events_processed`
- ✅ `customer.subscription.{created,updated,deleted}` + `invoice.{paid,payment_failed}` todos manejados
- ✅ Checkout valida `userId` desde `supabase.auth.getUser()`, no del body
- ✅ Customer Portal restringe acceso al dueño
- ✅ Price IDs vía env vars
- ✅ Errores devuelven 500 para que Stripe reintente
- ✅ `runtime = "nodejs"` en webhook (necesario para raw body)

---

## 5. Mux / Video — 3.0/10 🔴

**2 CRITICAL · 3 HIGH · 3 MEDIUM · 3 LOW**

> ### El uso de tokens es correcto, los webhooks tienen firma. Pero la combinación **playback_policies: ["public"]** + **playback_id expuesto al cliente** rompe el modelo de negocio entero.

| Sev | File:Line | Issue | Fix |
|-----|-----------|-------|-----|
| 🔴 CRIT | `app/api/mux/create-upload/route.ts:64` | `playback_policies: ["public"]` para contenido pagado ($25/mes). Cualquiera con el playback_id ve el video sin pagar. | Cambiar a `["signed"]`. |
| 🔴 CRIT | `components/module/section-teaching.tsx:75` + `app/(student)/fases/[slug]/modulos/[moduleSlug]/page.tsx:431` | `playback_id` crudo al cliente. Gating `has_access_to_module` se evade compartiendo el ID. | Generar `playbackToken` (JWT) server-side tras validar `hasAccess`. |
| HIGH | `app/api/mux/create-upload/route.ts` (handler) | **No hay cleanup de asset en Mux** al borrar/reemplazar sección → huérfanos = cost leak directo. | `muxClient().video.assets.delete(oldAssetId)` antes del update. |
| HIGH | `lib/mux/playback.ts` (ausente) | `README.md:8` promete `playback.ts` para signed URLs, **no existe**. Sin `MUX_SIGNING_KEY_ID`/`MUX_SIGNING_KEY_PRIVATE` en `.env.example`. | Crear con `jsonwebtoken`, kid=signing key id, TTL ≤6h, aud=`v`. |
| HIGH | `components/admin/live-session-form.tsx:357`, `section-edit-form.tsx:161` | Admin puede pegar **cualquier** `mux_playback_id` arbitrario (incluso de otra cuenta Mux). | Validar contra `muxClient().video.assets.retrieve()` antes de persistir. |
| MED | `app/api/webhooks/mux/route.ts:53` | Solo maneja `video.upload.asset_created` y `video.asset.ready`. Falta `video.asset.errored` → sección queda en "Procesando…" para siempre. | Añadir case `errored`. |
| MED | `app/api/webhooks/mux/route.ts:99-101` | Filtra playback_ids por `policy === "public"` hardcoded. | Leer de config. |
| MED | `app/api/mux/create-upload/route.ts:60` | `cors_origin: ... ?? "*"` permite uploads desde cualquier origen. | Allowlist. |
| LOW | `components/module/section-teaching.tsx:79-84` | `MuxPlayer` sin `onError`. | Toast + retry. |
| LOW | `lib/mux/server.ts:1-14` | ✅ Singleton correcto, `MUX_TOKEN_ID/SECRET` (access tokens, no signing). | Sin acción. |
| LOW | `app/api/webhooks/mux/route.ts:39-43` | ✅ Firma con `webhooks.unwrap` + `MUX_WEBHOOK_SECRET`. | Sin acción. |

### Plan de remediación Mux (prioridad)

1. **Día 1:** Crear `lib/mux/playback.ts` con signing JWT (variables `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE`)
2. **Día 1:** Migrar `create-upload` a `playback_policies: ["signed"]`
3. **Día 1:** Endpoint que devuelve token signed tras validar `has_access_to_module`
4. **Día 1:** Pasar `playbackToken` al `<MuxPlayer>` en vez de `playback_id` crudo
5. **Día 2:** Backfill — re-policy assets existentes a signed
6. **Día 2:** Hook de cleanup on delete/update de `module_sections`
7. **Día 2:** Validación de `mux_playback_id` admin
8. **Día 3:** `video.asset.errored` handler + allowlist CORS

---

## 6. Dependencies — 7.0/10

**0 CRITICAL · 1 HIGH · 4 MEDIUM · 6 LOW**

### CVEs

| Severity | Package | Range | CVE | Fix |
|----------|---------|-------|-----|-----|
| MEDIUM | `postcss` (transitivo de `next`) | `<8.5.10` | GHSA-qx2v-qp2m-jg93 (XSS via `</style>`) | `pnpm up next` o override |

### Hallazgos principales

| Sev | Package | Actual → Recomendado | Razón | Acción |
|-----|---------|---------------------|-------|--------|
| HIGH | `three` + `@types/three` | `0.149.0` → `0.184.0` | 35 minors atrás (~2.5 años) | `pnpm up three @types/three@latest` |
| MED | `next` | `16.2.6` → latest | Arrastra postcss vulnerable | `pnpm up next eslint-config-next` |
| MED | `@types/node` | `^20` → `^25` | Node 20 LTS termina pronto | `pnpm up -D @types/node@latest` |
| MED | `eslint` | `9.x` → `10.x` | Major disponible | `pnpm up -D eslint@latest` |
| MED | `typescript` | `5.x` → `6.x` | TS 6 GA | `pnpm up -D typescript@latest` |
| LOW | `shadcn` runtime dep | NO va en `dependencies` | Es CLI | `pnpm remove shadcn`; usar `pnpm dlx shadcn` |
| LOW | `tw-animate-css` | Verificar uso de clases | Solo `@import` en `globals.css` | Eliminar si no se usan |
| LOW | `three` + `vanta` + `@tsparticles/*` | 3 libs WebGL en landing | vanta YA depende de three (overlap) | Consolidar |
| INFO | `lucide-react@1.16.0` | ✅ Es el major actual | Re-versionaron desde 0.x | Mantener |

### Comandos sugeridos (orden)

```bash
pnpm up next eslint-config-next        # mata CVE postcss
pnpm up three @types/three@latest      # cierra gap 2 años
pnpm remove shadcn                     # mover a dlx
pnpm up                                # patches/minors menores
```

---

## 7. Performance & Queries — 7.2/10

**0 CRITICAL · 4 HIGH · 7 MEDIUM · 4 LOW**

### Findings principales

| Sev | File:Line | Issue | Fix |
|-----|-----------|-------|-----|
| HIGH | `app/api/cron/week-open-notify/route.ts:82-104` | N+1: 2 queries por alumno (modules + RPC week_window). 100 alumnos = 200 round-trips. | Pre-cargar en batch con `.in()`. |
| HIGH | `app/api/cron/grade-assignments/route.ts:105-140` | N+1 brutal: 4-5 queries seriadas por submission. 50 pending = 200+ queries. | Join via `.select("*, modules(...), profiles(...)")`. |
| HIGH | `app/api/cron/live-reminders/route.ts:120-128` | `admin.auth.admin.getUserById()` 1 vez por suscriptor (Auth API lentísima). | `listUsers({ page })` + Map por id, o cachear en `profiles.email`. |
| HIGH | `app/(student)/fases/page.tsx:55-95` | 5 queries seriadas que pueden paralelizarse + carga TODOS los modules. | `Promise.all([...])` para independientes. |
| MED | `app/admin/admisiones/page.tsx:89-95` | `limit(200)` hardcoded sin paginación real. Romperá UI. | `.range(from, to)` + `{ count: 'exact', head: true }`. |
| MED | `components/landing/globe.tsx` + `hero-particles.tsx` | `three+vanta+tsparticles` en landing (~400KB+ JS). | `next/dynamic({ ssr:false })`. |
| MED | `app/api/cron/admission-letters/route.ts:93-140` | N+1 serial (PDF + upload + email). | `Promise.allSettled` con `p-limit(3)`. |
| MED | `app/(public)/layout.tsx:1` | `'use client'` en layout público completo + AnimatePresence. Mata RSC en TODAS las páginas públicas. | Wrapper motion más pequeño; layout como Server Component. |
| MED | `lib/push/send.ts:67` | Sin rate-limit en batches grandes. | `p-limit(10)`. |
| MED | `next.config.ts` | Falta `experimental.optimizePackageImports`. | Añadir `["lucide-react", "motion"]`. |
| LOW | `app/(student)/dashboard/page.tsx:92-112` | 2 queries seriadas independientes. | `Promise.all`. |
| LOW | `app/admin/admisiones/page.tsx:102-104` | `.or().ilike()` sin índice GIN. | `pg_trgm` GIN. |
| LOW | Varias rutas admin/student | Sin `loading.tsx`. | Añadir skeletons. |
| LOW | `app/(public)/page.tsx:37` y públicas | Cada landing consulta `profiles` → fuerza dynamic. | Header logged-in como Client Component. |

### Buenas prácticas observadas

- ✅ 0 `select('*')` en código de aplicación
- ✅ `next/font/google` en root layout
- ✅ 0 `<img>` raw (todas via `next/image`)
- ✅ `loading.tsx` en 8 rutas críticas
- ✅ `.returns<T>()` para type-safety

---

## 8. Dead Code & Principles — 8.5/10

**0 CRITICAL · 0 HIGH · 9 MEDIUM (landing huérfano) · 9 LOW**

### Quick wins (15 min) — bajan ~30KB del bundle público

```bash
rm /Users/maxhebeling/Documents/DAP-Diplo/CLAUDE.md.backup-pre-v3
rm /Users/maxhebeling/Documents/DAP-Diplo/components/landing/{hero-section,stats-strip,phases-grid,phases-netflix-row,phase-card,animated-number,globe,hero-particles,perspective-path}.tsx
rm /Users/maxhebeling/Documents/DAP-Diplo/components/ui/field.tsx
```

### Otros findings

| Sev | File:Line | Issue | Acción |
|-----|-----------|-------|--------|
| LOW | `app/api/webhooks/stripe/route.ts:55,105,156` | `console.log` en producción | Logger estructurado o `console.warn`. |
| LOW | `app/api/cron/grade-assignments/route.ts:252` | `console.log` en cron | Quitar. |
| LOW | `lib/seo/structured-data.ts:34` | TODO redes sociales | Resolver o tracker. |
| LOW | `app/(student)/dashboard/page.tsx` | 774 líneas | Refactor: extraer a `components/student/`. |
| LOW | `components/module/quiz-player.tsx` | 685 líneas (UI + estado + scoring) | Extraer `useQuizState`. |
| LOW | DRY: `60 * 60 * 24` repetido en múltiples lugares | Magic numbers de tiempo | `lib/constants/time.ts`. |
| LOW | `lib/subscription/gate.ts` + `lib/forum/gate.ts` | Pattern gate auth duplicado | Helper `requireActiveUser()`. |
| LOW | `scripts/issue-certificate.ts` | Script one-off sin runner | Confirmar uso o borrar. |

### Lo bueno

- 0 código comentado en bloque
- 0 archivos `.old/.bak/-copy` en árbol fuente
- `console.error` (45) >> `console.log` (4) → logging defensivo
- 1 solo TODO en todo el proyecto

---

## Plan de acción priorizado

### 🔥 Esta semana (blockers de prod)

1. **Mux signing** — crear `lib/mux/playback.ts`, migrar a `playback_policies: ["signed"]`, pasar JWT al `<MuxPlayer>` (#1, #2, #4 Mux)
2. **Migración `verify_certificate`** — versionar la RPC (#1 Supabase)
3. **Storage policies** — buckets `ai-documents` y `certificates` (#3, #4 Supabase)
4. **CORS Mux upload** — quitar fallback `"*"` (#8 Mux / #2 Seguridad)
5. **CRON_SECRET preview** — falla cerrada (#3 Seguridad)

### 🛠 Próximas 2 semanas

6. **CVE postcss** — `pnpm up next eslint-config-next`
7. **Asset cleanup Mux** — hook on delete (#3 Mux)
8. **Cron N+1** — `week-open-notify`, `grade-assignments`, `live-reminders` (#1-#3 Performance)
9. **Security headers** — CSP/HSTS en `next.config.ts` (#1 Seguridad)
10. **Quick wins dead code** — borrar 9 componentes landing huérfanos
11. **Idempotencia Stripe** — `INSERT ... ON CONFLICT` atómico (#1 Stripe)
12. **ESLint errors** — fix los 19 errores (3 son bugs de hooks reales)

### 📈 Próximo mes (escalabilidad)

13. **Paralelización `/fases`** + paginación `/admin/admisiones`
14. **`three` upgrade** + consolidar libs WebGL
15. **TypeScript 6 + ESLint 10 + Node types 25**
16. **Refactor god files** — `dashboard/page.tsx`, `quiz-player.tsx`
17. **CI gate con ESLint** y bloqueo de deploy con `error` count > 0

---

## Apéndice: Limitaciones de esta auditoría

- Auditoría estática del código y migraciones; **NO se ejecutó** contra Supabase prod ni se verificaron policies vivas de buckets
- `pnpm build` corrió localmente con éxito; no se midió Web Vitals reales
- No se ejecutaron tests porque no hay suite de tests configurada en el proyecto
- Mux: confirmar en dashboard que existen signing keys o crearlas antes del fix

---

**Auditoría completada con 8 agentes paralelos** — Security, Build/TS, Supabase/RLS, Stripe, Mux, Dependencies, Performance, Dead code.
