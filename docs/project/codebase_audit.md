# Codebase Audit — DAP-Diplo

**Fecha:** 2026-05-22
**Stack:** Next.js 16.2.6 (Turbopack) · React 19.2.4 · Supabase 2.105 · Stripe 22.1 · Mux · Resend · framer-motion 12.38 · Sentry
**Estado:** Pre-launch (apertura 01 Jun, clases 23 Jun 2026)
**Score global:** **7.6 / 10**

## Executive Summary

Proyecto en muy buen estado para pre-launch. **Cero hallazgos críticos.** El stack es moderno, RLS cubre todas las 21 tablas, Stripe webhook es idempotente, secretos correctamente aislados del cliente. Los gaps son de **resiliencia/observabilidad/optimización** más que de seguridad o correctness.

**Top 5 a atacar antes del 01 Jun (orden recomendado):**
1. Agregar `error.tsx` global + en route groups críticos (sin esto, errores rompen UI)
2. Lazy-load MuxPlayer en 3 ubicaciones (~200KB bundle ahorrado por ruta sin video)
3. Fix 3 violaciones de hooks: `setState` dentro de `useEffect` (cascading renders)
4. Comprimir 12 imágenes >500KB (~15MB total en /public hoy)
5. Endpoint `/api/health` para monitoreo + alertas

## Scoring por categoría

| Categoría | Score | Issues encontrados |
|---|---|---|
| Security | 8.5/10 | 0 critical, 1 medium (admin RBAC), 3 low |
| Build & Types | 9.0/10 | 0 TS errors, 3 ESLint hook warnings, 1 unused import |
| Dependencies | 8.0/10 | 0 CVEs, 5 unused, falta lockfile |
| Code Principles | 7.5/10 | 1 DRY (Field/fieldCx duplicado), 1 TODO total |
| Code Quality | 7.5/10 | 3 archivos >500 LOC en client, 0 N+1 |
| Dead Code | 7.0/10 | ~80 unused exports vía ts-prune |
| Observability | 6.5/10 | No health check, sin logger central, 104 console.* |
| Concurrency | 8.0/10 | Webhook idempotente, multi-step ops sin transaction |
| Lifecycle | 7.0/10 | 0 next/dynamic, 0 error.tsx, suspense gaps |

## Hallazgos por severidad

### CRITICAL (0)

Ninguno. ✅

### HIGH (6)

| # | Archivo | Hallazgo | Fix |
|---|---|---|---|
| H1 | `app/dap-pastores-team/_components/promo-network.tsx:461` · `components/onboarding/onboarding-modal.tsx:50` · `components/onboarding/onboarding-signup-form.tsx:101` | `setState` dentro de `useEffect` sin guard adecuado → potencial cascading renders | Mover state update fuera del effect o usar reducer; ESLint react-hooks ya lo flagea |
| H2 | `components/demo/avatar-host.tsx` · `components/en-vivo/recording-card.tsx` · `components/module/section-teaching.tsx` | `import MuxPlayer from "@mux/mux-player-react"` eager → ~200KB en bundle de rutas sin video | `const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false })` |
| H3 | (todo el proyecto) | **0 `error.tsx`** en App Router. Cualquier error de RSC = página rota sin fallback | Crear `app/error.tsx` global + uno por route group crítico (`(student)`, `admin`) |
| H4 | `app/api/onboarding/complete/route.ts` · `app/api/checkout/create-subscription/route.ts` | Sin rate limiting → atacante puede spamear signups + Stripe checkouts | Vercel Edge Config rate limit (15 req/min/IP), o Upstash Ratelimit |
| H5 | (sin endpoint) | No existe `/api/health` ni `/api/status` → uptime monitor no puede chequear Supabase/Stripe/Mux | Agregar route que pingee `from('profiles').select('id').limit(1)` + stripe customer list |
| H6 | `app/api/webhooks/stripe/route.ts` (provisionSpouse2) · `app/api/onboarding/complete/route.ts` (marriage branch) | Multi-step ops sin transacción. Si falla a mitad, queda estado parcial | Idempotencia ya mitiga, pero envolver en `rpc()` con BEGIN/COMMIT para atomicidad real |

### MEDIUM (8)

| # | Archivo | Hallazgo | Fix |
|---|---|---|---|
| M1 | `components/onboarding/onboarding-signup-form.tsx:511-550` · `components/onboarding/spouse-fields.tsx:150-192` | `Field` + `fieldCx` duplicados idénticos | Extraer a `components/onboarding/field.tsx` |
| M2 | `/public/hero.jpg` (2.6MB) · `logo-red-apostolica.png` (2MB) · 10 más >500KB | ~15MB total en imágenes sin compresión | Pasar por squoosh/avif + usar `next/image` con `placeholder="blur"` |
| M3 | `package.json` | 5 deps declaradas no usadas: `shadcn`, `tw-animate-css`, `@tailwindcss/postcss`, `tailwindcss` (dev), `tsx` (dev) | `npm uninstall shadcn tw-animate-css` (verificar primero los dev) |
| M4 | 26 archivos | 104 `console.log/error/warn` sin logger central | Crear `lib/logger.ts` con prefijo módulo + Sentry breadcrumb |
| M5 | (todo el proyecto) | 0 usos de `next/dynamic` → todo client component se bundlea siempre | Auditar componentes pesados (Mux, PDF preview, charts) y aplicar dynamic |
| M6 | ts-prune | ~80 exports sin uso (algunos son lib pública intencional) | Correr `npx ts-prune` y eliminar 15-20 confirmados como dead |
| M7 | `app/admin/**` routes | Admin = solo check de `role === 'admin'`, sin RBAC granular (ej. `certificates.issue`, `students.manage`) | Tabla `admin_permissions(user_id, permission)` + check por endpoint |
| M8 | Crons | No loggean duración / count procesado / failures de manera estructurada | Wrapper `withCronLogging(name, fn)` que emite `{cron, duration_ms, processed, failed}` |

### LOW (8)

| # | Archivo | Hallazgo | Fix |
|---|---|---|---|
| L1 | `components/pwa/install-prompt.tsx` | 1 `@ts-ignore` | Tipar correctamente o `@ts-expect-error` con comentario |
| L2 | `components/layouts/dap-public-header.tsx:11` | `DapButton` importado sin usar | Eliminar import |
| L3 | repo root | No hay `package-lock.json` ni `pnpm-lock.yaml` | `npm i --package-lock-only` para reproducibilidad/audit |
| L4 | `app/api/webhooks/stripe/route.ts:67,131,172` · `app/api/cron/grade-assignments/route.ts:283` · `app/api/webhooks/mux/route.ts:46` | 5 `console.log` en routes prod | Migrar a `logger.info(...)` cuando exista lib/logger |
| L5 | `scripts/email-deliverability-test.ts` | Untracked, útil para testing Resend SPF/DKIM | Commit + agregar al `.gitignore`-equivalente si tiene secretos |
| L6 | `lib/seo/structured-data.ts:35` | 1 TODO sobre social links | Resolver cuando existan cuentas o eliminar |
| L7 | `package.json` | ESLint 9.39 → 10.4.0 (major) | Upgrade controlado, leer changelog |
| L8 | `app/api/webhooks/mux/route.ts:202` | Loggea `asset.errored` errors sin sanitizar | Scrub potencial PII antes de console.error |

### Advisory (3 — no penalizan score)

- **A1:** `app/dap-pastores-team/_components/promo-network.tsx` (521 LOC) — Justificado: SVG interactivo cinematográfico, cohesión alta, `prefers-reduced-motion` respetado, `whileInView` con `once`. No refactorizar por refactorizar.
- **A2:** `components/landing/globe.tsx` — `import * as THREE` aparenta bloat, pero el visualizer real (`vanta.globe`) sí se carga `async dynamic` — el `import * as` es para tipos. Bajo impacto.
- **A3:** `app/api/geo` público sin DB — edge runtime, lee solo headers. Sin rate-limit necesario; cacheable.

## Strengths (lo que está bien hecho)

**Seguridad**
- Cero secretos hardcodeados en código
- Service-role aislado a server-only (no leak al cliente)
- 21/21 tablas con RLS habilitado + policies completas
- `is_admin()` SQL function robusta
- Webhooks Stripe + Mux validan firma
- Security headers: HSTS, X-Frame-Options=DENY, nosniff, Permissions-Policy
- Crons protegidos con `CRON_SECRET` Bearer
- Sentry scrubbing PII (email, phone, full_name, matricula) antes de envío
- `dangerouslySetInnerHTML` solo para JSON-LD literal, nunca user input
- `httpOnly`/`secure` cookies vía Supabase SSR defaults

**Correctness**
- 0 errores TypeScript (tsc clean)
- Webhook Stripe idempotente (atomic claim con upsert ON CONFLICT)
- 6 eventos Stripe manejados (subscription.*, invoice.*, charge.refunded)
- Matrimonio AR: composite unique no rompe ninguna query existente (todas filtran user_id)
- Onboarding + quiz submit validados con zod
- 0 N+1 queries detectadas
- Event listeners con cleanup correcto

**Arquitectura**
- Named exports consistentes
- Route groups bien estructurados ((public), (student), admin)
- Sentry activo en client + server + edge con replay on-error
- Supabase migrations versionadas (31 archivos)
- Solo 1 TODO en todo el repo (muy baja deuda de comentarios)
- 4 tests e2e Playwright (signup, security headers, structured data, public pages)

## Pre-launch checklist (priorizado)

**Bloqueador (debe estar antes 01 Jun):**
- [ ] H3 — `error.tsx` global
- [ ] H4 — rate limit en `/api/onboarding/complete` y `/api/checkout/create-subscription`
- [ ] H5 — `/api/health`
- [ ] L3 — generar lockfile

**Recomendado (mejora calidad sin bloquear):**
- [ ] H1 — fix 3 `setState` in `useEffect`
- [ ] H2 — lazy-load MuxPlayer
- [ ] H6 — atomicidad explícita en webhook marriage flow
- [ ] M1 — extraer `Field` + `fieldCx` compartido
- [ ] M2 — comprimir imágenes /public
- [ ] M3 — eliminar deps no usadas

**Cuando haya tiempo (post-launch):**
- [ ] M4 + M5 + M6 + M7 + M8 — logger central, dynamic imports, dead code, RBAC granular, structured cron logging
- [ ] Todos los LOW

## Sources

- ESLint output (npm run lint)
- TypeScript output (npx tsc --noEmit)
- ts-prune (~80 unused exports)
- depcheck (unused deps)
- Manual grep + read de API routes, webhooks, migrations
- Inspección de bundle imports (next/image, dynamic, motion, three)
- Lectura completa de `app/api/webhooks/stripe/route.ts` y `app/api/onboarding/complete/route.ts`
- Migration audit (0001, 0011, 0014, 0021, 0023)

---

*Audit realizado vía 5 agentes Explore en paralelo (security, build/deps, code quality, API/data, perf/lifecycle).*
