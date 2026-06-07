# DAP — Diplomado Apostólico Pastoral

Plataforma web de educación premium para pastores y líderes ministeriales hispanohablantes. 72 módulos en 18 meses, 1 módulo por semana, avance por calendario (no por rendimiento).

**Prod**: [dapglobal.org](https://www.dapglobal.org) · [dap-diplo.vercel.app](https://dap-diplo.vercel.app)

> **Si vas a tocar código, leé [`CLAUDE.md`](./CLAUDE.md) completo primero.** Tiene las reglas de negocio, los invariantes operacionales y las convenciones que no se ven en el código.

## Qué resuelve

Antes de entrar un alumno tiene que:
1. Llenar formulario de admisión con datos personales, iglesia, ministerio y carta de consentimiento del pastor (si no pertenece a la Red Apostólica).
2. Esperar aprobación manual del equipo de admisiones.
3. Pagar suscripción mensual de **US$ 25 vía Stripe** (o equivalente AR vía Mercado Pago con descuento Argentina, individual o matrimonio).

Una vez adentro:
- Calendario personal arranca el primer martes después de la aprobación.
- 1 módulo por semana (5 secciones: introducción, enseñanza, activación, evaluación, frase de impartición).
- Quizzes autocorregibles con resultado a las 48h.
- Tareas escritas pre-corregidas por agente IA ("excorrector") y aprobadas por admin antes del envío al alumno.
- Rango ministerial al completar cada bloque (Discípulo → Hijo → ... → Enviado).
- MasterClasses y mentorías en vivo programadas por evento.
- Tutor IA con RAG (Claude + pgvector + Voyage embeddings).

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack, `proxy.ts` en vez de `middleware.ts`)
- **Lenguaje**: TypeScript 6 estricto, React 19.2
- **Estilos**: Tailwind 4 + Base UI (`base-nova` preset) + componentes DAP (ver `DESIGN-SYSTEM.md`)
- **DB**: Supabase Postgres (RLS en todas las tablas, pg_trgm + pgvector)
- **Auth**: Supabase Auth
- **Video**: Mux con `playback_policies: ["signed"]`
- **Pagos**: Stripe Subscriptions (USD) + Mercado Pago Checkout Pro (ARS, cash + transferencia, sin tarjetas)
- **Email**: Resend
- **Push**: web-push (VAPID)
- **Tutor IA**: Claude API + Supabase pgvector + Voyage AI embeddings
- **Hosting**: Vercel (CI + Cron + Edge)
- **Tests**: Playwright (E2E contra prod)
- **Quality gates**: ESLint `--max-warnings 0`, Lighthouse CI con thresholds CWV, `tsc --noEmit` estricto
- **Observabilidad**: Vercel Analytics + Speed Insights + Sentry (con scrub de PII)

## Estructura

```
app/
  (public)/    — landing, login, signup, /precios, /suscribirme, /como-funciona
  (student)/   — dashboard, fases/bloques, módulo player, comunidad, en vivo, tutor IA
  admin/       — backoffice (admisiones, correcciones, leads, push, comunidad, en vivo)
  api/         — route handlers, webhooks (Stripe, MP, Mux), crons
components/
  ui/          — primitivos (shadcn/Base UI)
  landing/     — hero, blocks grid, FAQ, etc.
  module/      — player de módulo (markdown, activation, quiz, evaluation)
  admin/       — sidebar, editores
lib/
  supabase/  stripe/  mercadopago/  mux/  email/  push/
  auth/  scheduling/  excorrector/  tutor/  certificates/  brief/
supabase/migrations/    — 39+ migrations numeradas 0001-NNNN
```

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # rellenar
pnpm dev                     # http://localhost:3000
pnpm tsc --noEmit            # TypeScript estricto
pnpm lint                    # ESLint, max-warnings 0
pnpm build                   # build de prod
pnpm test:e2e                # Playwright (¡corre contra prod!)
```

## Despliegue

- **Push a `main`** → auto-deploy a Vercel.
- Branches → preview deployments automáticos.
- Cron jobs configurados en `vercel.json` con auth `Bearer ${CRON_SECRET}`.
- Build CI corre: `tsc + lint + build` (verde obligatorio para merge).

## Soporte

Para preguntas técnicas, leer `CLAUDE.md`. Para issues operativos, escribir a `admisiones@dapglobal.org`.
