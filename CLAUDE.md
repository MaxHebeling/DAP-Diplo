# CLAUDE.md — DAP (Diplomado Apostólico Pastoral)

> **Lee este archivo COMPLETO al inicio de cada sesión antes de escribir código.**
> Si algo aquí entra en conflicto con lo que el usuario te pida, pregunta antes de seguir.
>
> **Versión 3.4** — admisión formal + calendario semanal personal + operational hardening (Mux signing, idempotencia atómica, CI estricto, E2E tests, observability). 72 módulos. Ver §13 para los invariantes operacionales y §12 para el historial.

---

## 1. Qué es DAP

DAP (Diplomado Apostólico Pastoral) es una plataforma web de educación premium para pastores y líderes ministeriales hispanohablantes. Es un programa de formación integral de **18 meses** que combina formación espiritual, liderazgo, gobierno, finanzas, empresas y tecnología.

Propiedad 100% del usuario. Código propio, base de datos propia.

**Identidad visual (ver `DESIGN-SYSTEM.md` para tokens completos):**
- Estética: **dark-tech-premium** (referencia: Linear, Vercel, Stripe Dashboard) con alma apostólica.
- Paleta: navy profundo `#07142B` + gradiente violeta `#7B61FF` → coral `#FF4D6D`.
- Tipografía: **Space Grotesk** (títulos) + **Inter** (cuerpo).
- Glassmorphism en cards. Gradientes de marca solo en CTAs primarios, logo, hero text, números destacados.
- Sistema de rangos visualizado con badges hexagonales (1 por bloque completado).

Idioma del producto: **español**. Idioma del código: **inglés**.

---

## 2. Modelo de negocio

- **Suscripción mensual de $25 USD** vía Stripe Subscription.
- **Ciclo de facturación personal:** Stripe cobra cada mes desde la fecha de admisión. Suscripción simple, sin pausas automáticas ni gating de cobro.
- **Duración total:** 72 semanas (~17 meses) — 1 módulo por semana.
- **Modelo de cancelación:** Netflix. Cancela → pierde acceso. Reactiva → retoma desde donde quedó (su progreso se conserva).

### Admisión (requisito de ingreso)

Antes de acceder al contenido, el aspirante completa un **formulario de admisión obligatorio**:

- **Datos personales** (obligatorios): nombre completo, fecha de nacimiento, país, ciudad, teléfono, email.
- **Pertenencia**: iglesia, ministerio, profesión, empresa/sector.
- **Pertenencia a la Red**: si pertenece a la **Red Apostólica Reino y Avivamiento** o **Revival & Kingdom Ministries, INC** → no requiere carta. Si NO pertenece → debe subir una **carta de consentimiento de participación firmada por su pastor**.
- Verificación: **por honor + revisión manual de admisiones**. El alumno declara su pertenencia; admisiones lo revisa antes de aprobar.

**Flujo de admisión:**
1. Aspirante envía la solicitud → notificación a `admisiones@dapglobal.org`.
2. Admisiones revisa (verifica pertenencia, valida carta de consentimiento si aplica).
3. Al aprobar: se fija `approved_at` y `program_start_date` (= primer martes después de la aprobación, vía función `next_tuesday`).
4. **Exactamente 24h después de la aprobación**: el sistema genera y envía la **carta de admisión en PDF** al email del alumno, firmada por el Dr. Max Hebeling.

### Avance por calendario semanal (regla central)

El avance lo manda el **calendario, no el rendimiento**. El tiempo fluye, complete o no.

- Cada alumno tiene un **calendario personal** que arranca en su `program_start_date` (primer martes tras admisión).
- **1 módulo por semana**: abre **martes 00:01**, cierra **lunes 23:59**.
- La función `current_program_week(user_id)` calcula en qué semana (1–72) está el alumno.
- El módulo de esa semana queda accesible (su contenido permanece para repaso aun después de cerrar). La **tarea/quiz** sí se cierra el lunes.
- Si el alumno no completa la tarea en su ventana → se marca **"no entregada"** o **"incompleta"**. El siguiente módulo abre igual el martes siguiente.

### "Aprobado" y certificación

Un módulo está **aprobado** cuando:
- Las 5 secciones tienen `section_progress.completed = true`.
- El quiz de evaluación tiene al menos un `quiz_attempts.passed = true`.

**Consecuencia de no completar:** se traslada a la **certificación**. Para obtener el **rango del bloque**, el alumno debe haber **aprobado los 8 módulos** del bloque (función `is_block_completed`). Quien tenga módulos incompletos no recibe el rango hasta completarlos (puede ponerse al día después; el contenido sigue accesible).

### Corrección de tareas y quizzes (resultados 48h después)

- **Quizzes** (opción múltiple / V-F): autocorregibles por el sistema. El resultado se **revela 48h después** de la entrega (no inmediato).
- **Tareas escritas** (sección Activación): corregidas por el **agente IA "excorrector"** que da feedback en la voz del Dr. Max Hebeling. Resultado enviado **48h después** de la entrega.
- Estados de la tarea: `open` → `submitted` → `correcting` → `completed`/`incomplete`. Si nunca se entregó al cerrar la ventana → `not_submitted`.

---

## 3. Estructura del producto

```
Diplomado (18 meses académicos)
  ├── Bloque 1: Fundamentos Espirituales (8 módulos, meses 1–2)
  │     ├── Mes 1 → módulos 1–4 del bloque
  │     └── Mes 2 → módulos 5–8 del bloque
  ├── Bloque 2: Identidad y Carácter (8 módulos, meses 3–4)
  ├── Bloque 3: Liderazgo y Discipulado (8 módulos, meses 5–6)
  ├── Bloque 4: Ministerio y Pastorado (8 módulos, meses 7–8)
  ├── Bloque 5: Administración y Gobierno (8 módulos, meses 9–10)
  ├── Bloque 6: Finanzas y Economía del Reino (8 módulos, meses 11–12)
  ├── Bloque 7: Empresas y Expansión (8 módulos, meses 13–14)
  ├── Bloque 8: Tecnología, IA y Comunicación (8 módulos, meses 15–16)
  └── Bloque 9: Gobierno Apostólico y Reforma (8 módulos, meses 17–18)
                                  Total: 72 módulos
```

**Cadencia: 4 módulos por mes académico.** Cada bloque = 2 meses;
módulos 1–4 del bloque en el primer mes, 5–8 en el segundo.
Distribución perfectamente simétrica (sin excepciones).

### Estructura interna de cada módulo (5 partes obligatorias)

| # | Sección | Contenido típico |
|---|---------|------------------|
| 1 | Introducción | Objetivo, revelación principal, aplicación |
| 2 | Enseñanza | Video principal (45–60 min) |
| 3 | Activación | Ejercicio práctico para aplicar de inmediato |
| 4 | Evaluación | Quiz que mide comprensión (umbral 70%) |
| 5 | Frase de impartición | Palabra apostólica de cierre |

### Sesiones en vivo (por evento, NO recurrentes)

El modelo NO tiene cadencia semanal fija. Las sesiones en vivo son
**eventos especiales** que el apóstol programa cuando lo decide:

- **MasterClass** — en vivo, por evento. **Mínimo garantizado: 1 al mes** (puede haber más). NO tiene día fijo de la semana.
- **Mentoría grupal** — también por evento (sin fecha mensual fija). El apóstol la convoca cuando lo decide.
- **Contenido grabado** — el alumno avanza a su ritmo por los 4 módulos del mes (ya no hay "clase de los lunes" recurrente).

Implicación técnica: la tabla `live_sessions` se usa para anunciar
estos eventos. El alumno se entera por **notificación + banner en el
dashboard + email** cuando se programa una sesión. NO hay cron de
recordatorio semanal fijo; el recordatorio se dispara relativo a la
fecha de cada evento programado.

Las sesiones de tipo `activation` quedan **eliminadas** (ya no hay
activaciones semanales de los viernes). La práctica/activación vive
ahora dentro de la Parte 3 de cada módulo (sección Activación).

### Sistema de rangos (1 por bloque completado)

| Bloque | Rango | Se otorga al terminar |
|--------|-------|------------------------|
| 1 | Discípulo     | Mes 2 |
| 2 | Hijo          | Mes 4 |
| 3 | Líder         | Mes 6 |
| 4 | Pastor        | Mes 8 |
| 5 | Administrador | Mes 10 |
| 6 | Mayordomo     | Mes 12 |
| 7 | Reformador    | Mes 14 |
| 8 | Arquitecto    | Mes 16 |
| 9 | Enviado       | Mes 18 |

Cada bloque completado entrega: insignia digital, certificado PDF descargable, rango visible en el perfil.

---

## 4. Stack técnico

| Capa | Herramienta |
|------|-------------|
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts` en vez de `middleware.ts`) |
| Lenguaje | TypeScript 6 estricto, React 19.2 |
| Estilos | Tailwind 4 + Base UI (preset `base-nova`, usa `render={<Link/>}` no `asChild`) + componentes DAP (`/components/ui-dap`) según `DESIGN-SYSTEM.md` |
| Base de datos | Supabase Postgres (RLS en TODAS las tablas, pg_trgm + pgvector instalados) |
| Auth | Supabase Auth (handler `handle_new_user` con `set search_path = public`) |
| Video | Mux con **playback_policies: ["signed"]** + tokens server-side (ver §13) |
| Pagos | Stripe Subscriptions $25/mes (SDK con `Stripe.createFetchHttpClient()` obligatorio en serverless) |
| Email | Resend |
| Push | web-push (VAPID keys) |
| Hosting | Vercel (CI + Cron + Edge) |
| Tutor IA | Claude API + Supabase pgvector + Voyage AI embeddings |
| Tests E2E | Playwright (3 suites contra prod) |
| Quality gates | ESLint `--max-warnings 0`, Lighthouse CI con thresholds CWV, tsc estricto |
| Observability | Vercel Analytics + Speed Insights (métricas) + **Sentry** (errores runtime, `lib/sentry/scrub.ts` filtra PII) |

---

## 5. Convenciones de código

### Estructura de carpetas
```
/app
  /(public)   - landing, login, signup, bloques públicos, suscribirme
  /(student)  - dashboard, mes actual, módulo, comunidad, en vivo, tutor IA
  /(admin)    - backoffice
  /api        - webhooks, route handlers
/components
  /ui          - shadcn (CLI)
  /landing     - hero, blocks grid, faq, etc.
  /student     - dashboard widgets, progreso, módulo viewer
/lib
  /supabase  /stripe  /mux  /utils  /email
/supabase/migrations
```

### Reglas firmes
- TypeScript estricto. Sin `any`.
- Server Components por defecto.
- RLS activado en todas las tablas. Sin policies = no se mergea.
- Validación con Zod en todos los inputs.
- Imports absolutos con `@/`.
- Conventional commits.

---

## 6. Modelo de datos (resumen)

| Tabla | Para qué |
|-------|----------|
| **profiles** | Datos del pastor (extiende auth.users). Campos clave: `program_start_date`, `matricula`, `admission_status`. |
| **admissions** | Solicitud de admisión: datos personales, pertenencia, carta de consentimiento, estado, carta PDF emitida. |
| **blocks** | Los 9 bloques temáticos. |
| **ranks** | Los 9 rangos. |
| **modules** | 72 clases. Tiene `course_week` (1–72) que indica en qué semana del programa se abre. |
| **module_sections** | Las 5 partes obligatorias de cada módulo. |
| **module_resources** | PDFs, audios, descargables. |
| **subscriptions** | Stripe Subscription por usuario. Campos: `status`, `stripe_subscription_id`, periods. Simple, sin pausa ni gating. |
| **stripe_events_processed** | Tabla de idempotencia para el webhook de Stripe. PK = `event.id`. **El handler claim atómico (upsert ignoreDuplicates) ANTES de procesar.** Ver §13. |
| **module_progress** | Estado del módulo por usuario (`completed` boolean). |
| **section_progress** | Estado de cada una de las 5 partes por usuario. |
| **assignment_submissions** | Tareas de la sección Activación: entrega, ventana (martes-lunes), estado, corrección IA, resultado 48h. |
| **student_ranks** | Rangos otorgados a cada alumno. |
| **quizzes / quiz_questions / quiz_attempts** | Evaluación de cada módulo (autocorregible). |
| **certificates** | Certificados por bloque completado. |
| **live_sessions** | MasterClass y mentorías (por evento, no recurrentes). |
| **forum_threads / forum_posts** | Comunidad. |
| **ai_conversations / ai_messages / ai_documents** | Tutor IA. |

### Conceptos que ya NO se usan (revertidos en migration 0011)

- **Gating académico** (`current_month_number`, `try_advance_month`, `is_month_completed`, `count_approved_modules_in_month`) — eliminado. El avance lo manda el calendario.
- **Pausa automática de cobro** (`pause_*`, `should_cancel_for_timeout`, `request_pause_extension`, tabla `pause_extensions`, view `subscriptions_pause_status`) — eliminado. Suscripción simple.
- `block_access`, `has_block_access`, `unlock_next_block_if_needed` — eliminados desde 0008.

### Funciones SQL críticas (vigentes tras migration 0011)

| Función | Devuelve | Cuándo se llama |
|---------|----------|-----------------|
| `current_program_week(user_id)` | int (0–72) | Calcula la semana del programa según `program_start_date`. Base de todo el calendario. |
| `has_access_to_module(module_id)` | bool | Gating del reproductor: `course_week ≤ semana actual` + suscripción activa. |
| `is_module_week_open(module_id, user_id)` | bool | ¿El módulo está en su ventana activa de esta semana? |
| `is_module_approved(user_id, module_id)` | bool | 5 secciones completas + quiz aprobado. Base de la certificación. |
| `is_block_completed(user_id, block_id)` | bool | Los 8 módulos del bloque aprobados → otorga rango. |
| `next_tuesday(from_date)` | date | Calcula el primer martes tras la aprobación de admisión (= `program_start_date`). |
| `has_active_subscription(user_id)` | bool | Acceso general. |

---

## 7. Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_DAP_SUBSCRIPTION_PRICE_ID=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=
# Signing keys (playback policy="signed" — contenido pagado, ver §13).
# El SDK acepta tanto MUX_SIGNING_KEY+MUX_PRIVATE_KEY (defaults SDK) como
# MUX_SIGNING_KEY_ID+MUX_SIGNING_PRIVATE_KEY (nombres del dashboard Mux).
MUX_SIGNING_KEY=
MUX_PRIVATE_KEY=
RESEND_API_KEY=
EMAIL_FROM=DAP <hola@dapglobal.org>
EMAIL_ADMISSIONS=admisiones@dapglobal.org   # recibe las solicitudes de admisión
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=
CRON_SECRET=                                 # autentica los crons (admisión 24h, apertura semanal, corrección 48h)
```

---

## 8. Reglas para Claude Code

1. Lee este archivo + §13 al inicio de cada sesión.
2. Una feature a la vez.
3. Muestra el plan antes de implementar si toca más de 3 archivos.
4. Migraciones de DB son inmutables una vez aplicadas con datos reales.
5. Nunca commitear secretos.
6. Nunca instalar dependencias sin pedir.
7. Base UI / shadcn vía CLI oficial.
8. Sin silenciar excepciones.
9. Comentarios solo para "por qué", no "qué".
10. **ESLint `--max-warnings 0` y tsc estricto pasan o no hay merge.** No introducir warnings nuevos — si es legítimo, agregar `eslint-disable` per-line con razón inline.
11. **`git add -A` está prohibido** — listar paths explícitos. Hay trabajo paralelo en untracked que no debe colarse en commits.
12. **Verificar antes de borrar** — sub-agentes a veces marcan archivos como "sin imports" equivocadamente. Grep manual en `app/` `components/` `lib/` antes de `rm`.

### Sí puedo sin pedir permiso:
- Crear/editar archivos del scope.
- Correr dev server, linter, tests.
- Commits descriptivos en rama de trabajo.

### NO puedo sin pedir permiso:
- Instalar dependencias.
- Tocar CLAUDE.md, package.json, migrations aplicadas.
- Push directo a main.
- Borrar archivos.

---

## 9. Estado actual

- [x] **Fase 0** — Setup base
- [x] **Fase 1** — Autenticación (+ Google OAuth en migration 0021)
- [x] **Fase 2** — Vista pública: landing + /como-funciona + /rangos + /precios + /fases/[slug] + /rangos/[slug] + structured data completo
- [x] **Fase 3** — Stripe Subscription simple ($25/mes) + webhook + drip + Customer Portal + welcome email
- [x] **Fase 4** — Reproductor de módulo + sidebar + stepper + Mux player con signed tokens + AdvanceButton
- [x] **Fase 5** — Quizzes (autocorregible, reveal 48h) + certificados (PDF) + cascada de rangos + página `/verificar/[code]`
- [x] **Fase 6** — Comunidad (foro con threads + posts + filtros)
- [x] **Fase 7** — Sesiones en vivo (live_sessions + cron reminders)
- [x] **Fase 8** — Tutor IA RAG (Voyage embeddings + pgvector + streaming Claude API)
- [x] **v3.4 Operational hardening** — auditoría total, security headers, CI estricto, E2E tests, Lighthouse CI, Vercel observability, Mux signed playback, Stripe idempotency atómica, charge.refunded handler, crons N+1 fixes. Ver §13.

---

## 10. Glosario

- **Pastor / alumno** → usuario final, suscriptor.
- **Diplomado** → el programa completo de 18 meses académicos (~72 semanas).
- **Bloque** → uno de los 9 grandes temas (2 meses académicos cada uno = ~8 semanas).
- **Mes académico** → unidad de organización curricular. Numerado 1–18. Cada mes contiene 4 módulos.
- **Semana del programa** → unidad de avance real (1–72). Calculada por `current_program_week()` desde `program_start_date` del alumno.
- **Módulo** → una clase de 45–60 min con 5 partes fijas. 4 por mes, 8 por bloque. Total 72. Cada módulo abre 1 semana (martes 00:01 → lunes 23:59).
- **Sección / parte** → una de las 5 partes obligatorias de cada módulo.
- **Aprobado** → módulo con 5 secciones completadas + quiz pasado. Requisito para certificación, NO para avance (el calendario manda).
- **Rango** → título ministerial otorgado al completar un bloque (aprobar los 8 módulos).
- **MasterClass** → sesión en vivo. Por evento, mínimo 1/mes garantizado. NO tiene día fijo.
- **Mentoría grupal** → sesión en vivo por evento (sin cadencia fija). Convocada por el apóstol.
- **Activación** → Parte 3 de cada módulo (ejercicio práctico). YA NO es sesión en vivo separada.
- **Admisión** → solicitud formal previa al ingreso. Aprobada manualmente por equipo de admisiones. Dispara `program_start_date` (primer martes después) y carta PDF firmada 24h después.

---

## 11. Decisiones tomadas (con razón)

| Decisión | Por qué |
|----------|---------|
| Suscripción mensual simple (sin pausa de cobro) | Stripe maneja todo nativamente. Modelo Netflix puro: cobra mientras esté activa, deja de cobrar al cancelar. |
| Avance por calendario semanal (no por rendimiento) | El tiempo manda. Quita carga emocional de "perder el mes". El gating viene por **admisión** (filtro previo). |
| Admisión formal con carta del pastor (si no es de la Red) | Filtro de seriedad. Asegura que quien entra está respaldado pastoralmente y es seleccionado, no comprado. |
| Carta PDF de admisión firmada por el Dr. Max 24h después | Refuerzo simbólico del compromiso. Convierte la inscripción en un acto formal, no transaccional. |
| Modelo Netflix (cancela = pierde acceso) | Simple operacionalmente. Progreso se conserva si reactiva. |
| Resultados de quizzes + tareas 48h después | Genera anticipación, evita el "quiz como juego". Tareas escritas pasan por agente IA "excorrector" con voz del Dr. Max. |
| Rangos al completar bloque (aprobar los 8 módulos) | Los 9 rangos clásicos son hitos visibles. Quien no aprueba todos los módulos del bloque, no recibe el rango hasta ponerse al día. |
| 9 bloques × 8 módulos = 72 (4/mes, 1/semana simétrico) | Programa enfocado. 4 módulos/mes (1/semana) deja respirar. El valor se complementa con MasterClass, mentoría, comunidad y tutor IA. |
| Sesiones en vivo por evento (no semanales) | Quita carga operativa de dar clase cada semana. MasterClass como "evento especial" (mín. 1/mes). Mentoría por convocatoria. |
| Activación dentro del módulo (no sesión separada) | Aplicación práctica vive al lado de la enseñanza, no en otro día. Mayor cohesión pedagógica. |
| 5 partes fijas por módulo | Estandariza experiencia, certificación clara, métricas comparables. |
| Sin venta de bloques sueltos | Modelo simple. Si se evalúa después, se añade. |
| Stripe Subscriptions sobre Checkout one-time | El modelo de cobro lo requiere. Renovaciones, cancelaciones, etc. |
| Mux sobre Cloudflare Stream | Mejor player, analítica más detallada, posicionamiento premium del producto. |

---

## 12. Cambios desde la versión anterior (v2 → v3)

> Para que Claude Code entienda qué se rediseñó al pasar al modelo mensual.

- **Antes:** drip por bloque cada 2 meses calendario. **Ahora:** drip mensual con gating académico.
- **Antes:** `block_access` table + `has_block_access()` + `unlock_next_block_if_needed()`. **Ahora:** `subscriptions.current_month_number` + `has_access_to_module()` + `try_advance_month()`.
- **Antes:** "aprobar" no era condición de acceso. **Ahora:** sí lo es (5 secciones + quiz).
- **Antes:** los módulos estaban solo agrupados por bloque. **Ahora:** además tienen `course_month` (1–18) que define cuándo se desbloquean.
- **v3.2 (rediseño curricular):** de 200 módulos (22/bloque, 11/mes) a **72 módulos (8/bloque, 4/mes)**. Sesiones en vivo dejan de ser semanales fijas y pasan a eventos (MasterClass mín. 1/mes, mentoría por evento). Activaciones semanales eliminadas (viven en la Parte 3 de cada módulo). Ver migration 0010.
- **v3.3 (admisión + calendario semanal):** se ELIMINA el gating académico y la pausa automática de cobro (migrations 0008/0009 revertidas en 0011). El avance ahora lo manda el **calendario**: 1 módulo/semana (martes 00:01 — lunes 23:59), calendario personal por alumno desde su `program_start_date`. Se AGREGA el **sistema de admisión** (formulario + carta de consentimiento condicional + carta PDF de admisión 24h después firmada por Dr. Max Hebeling) y `assignment_submissions` (tareas corregidas por IA, resultados 48h). Para el rango del bloque hay que aprobar los 8 módulos. Suscripción $25/mes simple. Ver migration 0011. **El CHECKLIST-CAMBIO-MENSUAL.md queda obsoleto.**
- **Antes:** rangos se otorgaban al completar bloque, pero no había concepto de "mes académico". **Ahora:** el sistema lleva `current_month_number` y el rango sigue saliendo al completar bloque entero.
- **v3.4 (operational hardening — auditoría total):** auditoría con 8 agentes paralelos identificó 3 CRITICAL + 11 HIGH; todo cerrado. Cambios estructurales:
  - **Mux signed playback** — los uploads ahora usan `playback_policies: ["signed"]` y los tokens se firman server-side con TTL 6h (`lib/mux/playback.ts`). Antes el `playback_id` solo bastaba para ver contenido pagado. Ver §13.
  - **Stripe idempotency atómica** — `upsert ignoreDuplicates` en `stripe_events_processed` ANTES de procesar, en vez de SELECT-then-INSERT. Cierra ventana de race con duplicados.
  - **Stripe `charge.refunded` handler** — full refund revoca acceso inmediato (sub `canceled`).
  - **Security headers** — HSTS, X-Frame DENY, X-Content-Type, Referrer-Policy, Permissions-Policy en `next.config.ts`.
  - **CI gates** — 3 workflows: `ci.yml` (tsc + lint `--max-warnings 0` + build), `e2e.yml` (Playwright contra prod), `lighthouse.yml` (CWV thresholds).
  - **Vercel Analytics + Speed Insights** — instalados, capturando pageviews + Core Web Vitals reales.
  - **SEO completo** — Organization (+ Person founder) + WebSite + FAQPage + Course + BreadcrumbList + ItemList. `pg_trgm` + indexes GIN en `admissions` para search rápido.
  - **N+1 fixes** — los 3 crons (`week-open-notify`, `grade-assignments`, `live-reminders`) batchean queries en bulk via `.in()` y `Promise.all`. `live-reminders` usa `listUsers` paginado en vez de `getUserById` en loop.
  - **DRY** — `lib/constants/time.ts` (SECONDS_PER_DAY, MS_PER_HOUR, etc) reemplaza magic numbers. `lib/hooks/use-media-query.ts` con `useSyncExternalStore` (compatible React Compiler).
  - **CVE postcss** cerrado via `pnpm.overrides`. `three` 0.149 → 0.184. TypeScript 6 + @types/node 25. ESLint 10 BLOQUEADO por `eslint-config-next` que arrastra `eslint-plugin-react@7`.

---

## 13. Operational hardening (v3.4 — invariantes)

> Esta sección documenta patrones que **un futuro agente no debe romper**. Son trade-offs probados en la auditoría — cambiarlos requiere entender por qué se eligieron.

### 13.1 Mux signed playback (NO romper)

**Invariante:** ningún `<MuxPlayer>` recibe `playbackId` crudo sin token. Si lo hace, cualquier persona con el ID ve el contenido pagado sin pasar por la suscripción — el bug que cerró la auditoría.

**Flujo correcto:**

1. **Upload** (`app/api/mux/create-upload/route.ts`): `playback_policies: ["signed"]`. CORS con allowlist (`NEXT_PUBLIC_APP_URL` + Vercel preview), nunca `*`.
2. **Webhook** (`app/api/webhooks/mux/route.ts`): al recibir `video.asset.ready`, prefiere `policy === "signed"` (fallback a `public` solo para assets viejos pre-migración). Maneja también `video.asset.errored` limpiando los IDs para que admin pueda re-intentar.
3. **Server component** que renderiza el video: tras validar acceso (RLS / `has_access_to_module`), llama `signMuxPlayerTokens(playbackId)` y pasa el resultado al cliente.
4. **Cliente** (`components/module/section-teaching.tsx`): renderiza `<MuxPlayer playbackId={...} tokens={...} onError={...} />`. Sin `tokens`, muestra mensaje de error en vez de pantalla negra.

**Si vas a reemplazar el reproductor o agregar un nuevo flow de video:** llamá `signMuxPlayerTokens` server-side. Nunca tries de hacer signing client-side (la private key NO va al cliente).

**Admin pega manualmente un `mux_playback_id`** (live sessions, recovery): `updateSectionAction` valida contra `mux.video.playbackIds.retrieve()` antes de persistir — evita IDs de otras cuentas Mux.

**Cleanup:** cuando se re-uploadea sobre una sección que ya tenía asset, el webhook borra el viejo en Mux (`deleteMuxAssetIfOrphan`). Evita cost leak.

### 13.2 Stripe webhook idempotency (NO romper)

**Invariante:** el webhook hace **claim atómico** antes de procesar.

```ts
const { data: claimed } = await admin
  .from("stripe_events_processed")
  .upsert({ id: event.id, type: event.type },
          { onConflict: "id", ignoreDuplicates: true })
  .select("id");
if (!claimed || claimed.length === 0) return { idempotent: true };
// ... procesar ...
// Si falla: DELETE el claim para que Stripe retry pueda re-procesar.
```

**No reintroducir** el patrón `SELECT → procesar → INSERT` viejo. Era la ventana de race donde 2 entregas paralelas del mismo evento ejecutaban handlers en duplicado (welcome email 2x, subscription upsert pisado).

**Handlers vigentes:** `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded` (full refund → sub `canceled` inmediato; partial → log only).

**Cliente Stripe en serverless:** SIEMPRE `httpClient: Stripe.createFetchHttpClient()` (ya en `lib/stripe/server.ts`). El Node http default falla en cold starts de Vercel.

### 13.3 Cron auth (NO aflojar)

**Invariante:** `isAuthorized()` en cada cron route **falla cerrada** si `CRON_SECRET` no está seteado. Antes dejaba pasar en preview/dev, exponiendo gasto Claude/Resend desde cualquier preview público.

```ts
if (!expected) return false;  // ← NO cambiar a `return process.env.VERCEL_ENV !== "production"`
```

### 13.4 Performance patterns que el linter NO captura

- **Bulk queries** — los crons (`week-open-notify`, `grade-assignments`, `live-reminders`) y page loads (`/fases`) pre-fetchean dimensiones en bulk con `.in()` + `Promise.all`, no `for (item) { await query(item) }`. Cualquier nuevo cron o página debe seguir el patrón.
- **Server component paraleliza** — todas las queries independientes tras `auth.getUser()` van en `Promise.all([...])`.
- **`force-dynamic` solo cuando es necesario** — el default es estático/cached. No agregarlo "por las dudas".

### 13.5 React 19 strict + Compiler

- **`setState` dentro de `useEffect` body** → flag rojo. Patrones aceptables:
  - Mover al event handler (preferido).
  - `useState` lazy initializer si es one-time mount init.
  - `useSyncExternalStore` para media queries / external state (ver `lib/hooks/use-media-query.ts`).
  - Último recurso: `eslint-disable-next-line` con razón inline.
- **`Math.random()` o efectos secundarios en `useMemo`** → no. El Compiler asume puro y puede descartar la memoización. Usar `useState` lazy o `useEffect`.
- **`form.watch()` de react-hook-form** → migrar a `useWatch({ control, name })`. `watch()` rompe la memoización del Compiler del archivo entero.

### 13.6 CI gates (3 workflows)

| Workflow | Trigger | Bloquea merge |
|----------|---------|---------------|
| `ci.yml` | push + PR a main | ✅ tsc + lint `--max-warnings 0` + build |
| `e2e.yml` | push + PR a main | ⚠️ continue-on-error (Playwright contra prod) |
| `lighthouse.yml` | push + PR a main | ⚠️ continue-on-error (CWV thresholds) |

`continue-on-error: true` en los dos últimos porque corren contra prod — un downtime de Vercel no debe bloquear merges de código sano. **Cuando haya baseline estable (~1 semana sin falsos positivos), remover el flag para hacer gate real.**

### 13.7 SEO structured data (NO desinstrumentar)

Cada página pública emite `<script type="application/ld+json">` con su schema. Si removés uno, `tests/e2e/structured-data.spec.ts` falla.

| Página | Schemas emitidos |
|--------|------------------|
| `/` (root layout) | Organization (con `personSchema()` founder) + WebSite |
| `/` (FaqSection) | FAQPage |
| `/fases/[slug]` | Course + BreadcrumbList |
| `/rangos` | ItemList + BreadcrumbList |
| `/rangos/[slug]` | Course + BreadcrumbList |

Helpers viven en `lib/seo/structured-data.ts`. Agregar nuevos schemas ahí, no inline.

### 13.8 Tests E2E

3 specs en `tests/e2e/` corren contra prod por default:
- `public-pages.spec.ts` — smoke de páginas públicas + sanity check de que no haya `service_role` en bundle.
- `security-headers.spec.ts` — los 5 headers de `next.config.ts` están vivos.
- `structured-data.spec.ts` — los schemas JSON-LD están emitidos.
- `signup.spec.ts` — maneja ambos estados (form abierto vs `isEnrollmentOpen()` cerrado).

Correr local: `pnpm test:e2e`. Override target: `BASE_URL=http://localhost:3000 pnpm test:e2e`.

### 13.9 Lighthouse thresholds calibrados

| Métrica | Threshold | Baseline prod actual |
|---------|----------:|---------------------:|
| Performance | ≥ 0.85 | 0.87-1.00 |
| Accessibility | ≥ 0.85 | 0.85-0.96 |
| Best Practices | ≥ 0.95 | 1.00 |
| SEO | ≥ 0.95 | 1.00 |
| LCP | ≤ 3000ms | 808-1780ms warm |
| CLS | ≤ 0.10 | 0.000 |
| TBT | ≤ 500ms | 0-236ms |
| FCP | ≤ 2000ms | <1000ms |

Si Lighthouse CI empieza a fallar consistentemente, **investigar la regresión antes de aflojar el threshold**.

### 13.10 Observability

**Layer 1 — Métricas** (`app/layout.tsx`):
- `@vercel/analytics` — pageviews, países, dispositivos
- `@vercel/speed-insights` — Core Web Vitals reales de usuarios
- Dashboards: Vercel project → tabs Analytics / Speed Insights

**Layer 2 — Errores runtime** (`sentry.{client,server,edge}.config.ts`):
- Sentry SDK con `tracesSampleRate: 0.2`, Session Replay solo on-error
- `lib/sentry/scrub.ts` — `beforeSend` filtra PII (email, full_name, dirección, church_name, auth tokens) recursivamente antes de enviar
- `tunnelRoute: "/monitoring"` evade ad-blockers que bloquean `*.sentry.io`
- Org: `ikingdom-llc` · Project: `javascript-nextjs` · Dashboard: https://ikingdom-llc.sentry.io
- Alerta activa: "New issue created" → email a Max al primer evento
- Env vars en Vercel prod: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`

**NUNCA hacer:**
- Logear el body completo de un webhook de Stripe/Mux (contiene PII). Para context custom usar `Sentry.setContext()` con keys que pasen por el scrub.
- Setear `Sentry.setUser({ email, name })` directo — el scrub deja solo `id` pero conviene no enviar de entrada.

**Vercel Logs** sirven para debugging puntual; NO reemplazan tracking de errores agrupado.
