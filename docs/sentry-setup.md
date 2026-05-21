# Sentry Setup (manual)

DAP no tiene Sentry instalado todavía. Cuando quieras agregar tracking
de errores en runtime (webhooks Stripe/Mux fallando, crons crasheando,
500s del lado del server), seguí estos pasos.

## Por qué Sentry y no Vercel Logs

Vercel Logs sirven para debugging puntual (buscar un request por ID),
pero NO te avisan cuando algo se rompe. Sentry:
- Agrupa errores por stack trace (1 bug = 1 issue, no N copias)
- Te manda email/Slack cuando ocurre algo nuevo
- Da contexto (request body, breadcrumbs, user que lo disparó)
- Capture spans para tracing (qué query tomó 5s)

Vercel Analytics + Speed Insights (ya instaladas) cubren métricas y Core
Web Vitals, NO errores de runtime.

## Steps

### 1. Crear cuenta + proyecto en Sentry

1. Sign up en https://sentry.io (free tier: 5k errors/mes, suficiente
   para arrancar DAP).
2. Create project → platform: **Next.js**.
3. Anota el **DSN** que te muestra (algo como `https://abc@o123.ingest.sentry.io/456`).

### 2. Generar Auth Token para upload de source maps

1. https://sentry.io/settings/account/api/auth-tokens/
2. Create New Token con scopes: `project:releases` + `org:read`.
3. Copialo (solo se muestra 1 vez).

### 3. Instalar SDK

```bash
cd /Users/maxhebeling/Documents/DAP-Diplo
pnpm add @sentry/nextjs
```

### 4. Correr el wizard

```bash
pnpm exec @sentry/wizard@latest -i nextjs
```

El wizard te pide:
- DSN (paso 1)
- Auth token (paso 2)
- Org slug + project slug (los ves en la URL del dashboard)

Crea automáticamente:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`
- Modifica `next.config.ts` con `withSentryConfig()`

### 5. Configurar Vercel env vars

```bash
printf "%s" "https://xxx@o123.ingest.sentry.io/456" | vercel env add NEXT_PUBLIC_SENTRY_DSN production
printf "%s" "sntrys_xxx..." | vercel env add SENTRY_AUTH_TOKEN production
```

(`NEXT_PUBLIC_SENTRY_DSN` se expone al cliente — Sentry lo necesita para
enviar errores client-side. El DSN no es secreto, solo identifica el
proyecto.)

### 6. Test inicial

Antes de mergear, disparar un error de prueba:

```ts
// En cualquier route handler:
throw new Error("Sentry test from prod");
```

Visitar la ruta y verificar que aparezca el error en sentry.io en <1 min.
Luego revertir el throw.

### 7. Alertas

En Sentry → Alerts → Create Alert:
- Nueva issue: email inmediato
- Issue >50/hora: ping a Slack (si tenés webhook)
- Performance: P95 latency >2s en cualquier transaction

### 8. Source maps en CI

Si querés stack traces legibles (con código TS no minificado), el wizard
ya configura el upload de source maps en build. Asegurate que el job de
CI tenga `SENTRY_AUTH_TOKEN` en GitHub Secrets si vas a hacer builds desde
CI (actualmente sólo se hace `pnpm build` para validación, no se sube; el
build de prod corre en Vercel donde la env var ya está).

## Lo que NO conviene loguear

- Cualquier body que contenga `password`, `auth`, `token`, `secret`.
- Stripe webhook payloads completos (contienen `customer.email` y card
  details parciales). Filtrar en `beforeSend` del config.
- PII del alumno (full_name, email, dirección). Sentry tiene scrubbing
  default razonable, pero conviene revisar el primer event real.

## Costos

Free tier alcanza para los primeros meses de DAP. Si crece:
- Team plan: $26/mes — 50k errors + 10k performance units
- Business: $80/mes — 100k errors + features avanzados

Para 100-200 alumnos activos, free tier es suficiente si la app está
estable (estimamos <1k errors/mes incluyendo todos los webhooks).
