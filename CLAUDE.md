# CLAUDE.md — DAP (Diplomado Apostólico Pastoral)

> **Lee este archivo COMPLETO al inicio de cada sesión antes de escribir código.**
> Si algo aquí entra en conflicto con lo que el usuario te pida, pregunta antes de seguir.

---

## 1. Qué es DAP

DAP (Diplomado Apostólico Pastoral) es una plataforma web de educación premium para pastores y líderes ministeriales hispanohablantes. Es un programa de formación integral de **18 meses** que combina formación espiritual, liderazgo, gobierno, finanzas, empresas y tecnología.

El producto es propiedad 100% del usuario (Max Hebeling) — no es un wrapper de SaaS. Código propio, base de datos propia, marca propia.

**Idioma del producto:** español (UI, emails, documentación visible al usuario). El código y los nombres de variables/tablas van en inglés.

**Posicionamiento visual:** premium — Netflix / MasterClass / Apple Education / Hillsong College moderno. No es un Moodle más.

---

## 2. Modelo de negocio

- **Suscripción mensual de $25 USD** vía Stripe Subscription.
- **Duración total:** 18 meses (= 9 bloques × 2 meses cada uno).
- **Costo total del diplomado:** $450 USD si paga los 18 meses completos.
- **Drip por bloque:** se desbloquea 1 bloque nuevo cada 2 meses de suscripción activa.
- **Modelo "Netflix":** si cancela la suscripción pierde acceso a los bloques. Puede reactivar y retoma desde donde iba (su progreso queda guardado).
- **Acceso a contenido grabado + sesiones en vivo + mentoría grupal mensual.**
- **No hay venta de bloques sueltos** (decisión inicial; puede añadirse después como modalidad alternativa).

---

## 3. Estructura del producto

```
Diplomado (18 meses)
  ├── Bloque 1: Fundamentos Espirituales (2 meses, 22 módulos)
  │     └── Módulo: una "clase" de 45–60 min
  │           ├── Parte 1 — Introducción (objetivo, revelación, aplicación)
  │           ├── Parte 2 — Enseñanza (bíblica, práctica, moderna)
  │           ├── Parte 3 — Activación (ejercicio práctico)
  │           ├── Parte 4 — Evaluación (test / quiz)
  │           └── Parte 5 — Frase de impartición
  ├── Bloque 2: Identidad y Carácter (2 meses, 22 módulos)
  ├── Bloque 3: Liderazgo y Discipulado (2 meses, 22 módulos)
  ├── Bloque 4: Ministerio y Pastorado (2 meses, 22 módulos)
  ├── Bloque 5: Administración y Gobierno (2 meses, 22 módulos)
  ├── Bloque 6: Finanzas y Economía del Reino (2 meses, 22 módulos)
  ├── Bloque 7: Empresas y Expansión (2 meses, 22 módulos)
  ├── Bloque 8: Tecnología, IA y Comunicación (2 meses, 22 módulos)
  └── Bloque 9: Gobierno Apostólico y Reforma (2 meses, 24 módulos)
                                                Total: 200 módulos
```

### Cronograma semanal (sesiones en vivo, opcionales)
- **Lunes** — Clase principal (grabada, premium).
- **Miércoles** — MasterClass en vivo.
- **Viernes** — Activación práctica.
- **Mensual** — Mentoría grupal.

> El alumno avanza **a su propio ritmo** por el contenido grabado. Las sesiones en vivo son opcionales (se graban para quien no asistió).

### Sistema de rangos (1 por bloque completado)

| Bloque | Rango desbloqueado |
|--------|---------------------|
| 1 | Discípulo |
| 2 | Hijo |
| 3 | Líder |
| 4 | Pastor |
| 5 | Administrador |
| 6 | Mayordomo |
| 7 | Reformador |
| 8 | Arquitecto |
| 9 | Enviado |

Cada bloque completado entrega: insignia digital, certificado PDF descargable, rango visible en el perfil, y "autoridad" (acceso a contenido o privilegios extra en la comunidad — definir después).

---

## 4. Stack técnico (no cambiar sin consultar)

| Capa | Herramienta | Notas |
|------|-------------|-------|
| Framework | **Next.js 16** (App Router, Turbopack) | TypeScript estricto. Server Components por defecto. `middleware.ts` renombrado a `proxy.ts` (convención Next 16). |
| UI runtime | **React 19.2** | Server Components, Server Actions, `use()` hook. |
| Estilos | **Tailwind CSS v4** + **shadcn/ui** (preset `base-nova`) | shadcn copiado al repo. Usa **Base UI** (`@base-ui/react`), no Radix — los componentes exponen `render` (no `asChild`). |
| Base de datos | **Supabase (Postgres)** | Auth + DB + Storage en el mismo servicio. |
| Auth | **Supabase Auth** + `@supabase/ssr` | Email + password al inicio. Confirmación de correo desactivada para MVP. |
| Video | **Mux** | Player y streaming. NUNCA hostear video en Supabase Storage. |
| Pagos | **Stripe Subscriptions** | Subscription recurrente $25/mes. Webhook para actualizar `months_paid_total` y desbloquear bloques. |
| Email transaccional | **Resend** | Bienvenida, confirmación de pago, desbloqueo de bloque, certificados, recuperación de password. |
| Hosting | **Vercel** | Deploy automático desde `main`. |
| Tutor IA (Fase 8) | **Claude API + Supabase pgvector** | RAG con materiales del DAP. |

**Versiones mínimas:** Node 20+, pnpm preferido.

---

## 5. Convenciones de código

### Estructura de carpetas
```
/app
  /(public)               # Landing, login, signup, página de venta
  /(student)              # Área del alumno (dashboard, bloques, módulos, comunidad, tutor IA)
  /(admin)                # Backoffice (CRUD de bloques, módulos, secciones, en vivo, etc.)
  /api                    # Route handlers (webhooks Stripe, Mux, etc.)
/components
  /ui                     # Componentes shadcn (gestionados por CLI)
  /brand                  # Logo y elementos de marca
  /auth                   # signup-form, login-form, sign-out-button
  /[feature]              # Componentes por feature
/lib
  /supabase
  /stripe
  /mux
  /auth                   # schemas zod + Server Actions
  /utils.ts
  /format.ts
/types
/supabase
  /migrations
  /seed.sql               # Pre-carga de bloques, módulos, rangos
```

### Reglas firmes
- **TypeScript estricto.** `strict: true`. Sin `any`.
- **Server Components por defecto.**
- **RLS activado en todas las tablas.** Sin policies = no se mergea.
- **Validación con Zod en todos los inputs.**
- **Nombres en inglés (código), textos en español (UI).**
- **Imports absolutos con `@/`.**
- **Sin librerías nuevas sin preguntar.**

---

## 6. Modelo de datos (resumen)

Tablas principales. Detalle completo en `/supabase/migrations/0001_initial_schema.sql`.

| Tabla | Para qué |
|-------|----------|
| **profiles** | Datos del pastor (extiende auth.users). |
| **blocks** | Los 9 bloques del diplomado. |
| **ranks** | Los 9 rangos (Discípulo, Hijo, …, Enviado). |
| **modules** | Las clases de 45–60 min (200 en total). Pertenecen a un bloque. |
| **module_sections** | Las 5 partes obligatorias de cada módulo (intro, teaching, activation, evaluation, impartation). |
| **module_resources** | PDFs, audios, plantillas descargables por módulo. |
| **subscriptions** | Registro de Stripe Subscription por usuario. Mantiene `months_paid_total`. |
| **block_access** | Qué bloques tiene desbloqueado cada usuario y desde cuándo. |
| **module_progress** | Estado del módulo por usuario (visto, completado). |
| **section_progress** | Estado de cada una de las 5 partes por usuario. |
| **student_ranks** | Rangos obtenidos por cada alumno. |
| **quizzes / quiz_questions / quiz_attempts** | Evaluación de cada módulo (sección 4). |
| **certificates** | Certificados emitidos por bloque completado. |
| **live_sessions** | MasterClass de los miércoles, Activaciones de los viernes, Mentorías mensuales. |
| **forum_threads / forum_posts** | Comunidad entre pastores. |
| **ai_conversations / ai_messages** | Tutor IA (Fase 8). |

---

## 7. Variables de entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_DAP_SUBSCRIPTION_PRICE_ID=        # el Price ID del subscription de $25/mes

# Mux
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
EMAIL_FROM=DAP <hola@dap.tudominio>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Claude (Fase 8)
ANTHROPIC_API_KEY=
```

---

## 8. Reglas para Claude Code

1. **Antes de tocar código, leer este archivo y el PLAN-IMPLEMENTACION.md.**
2. **Una feature a la vez.** No "implementa todo el LMS".
3. **Mostrar el plan antes del código** si toca más de 3 archivos.
4. **Migraciones de DB son inmutables** una vez aplicadas a producción real con datos.
5. **Nunca commitear secretos.**
6. **Nunca correr `pnpm install` sin confirmar la librería.**
7. **Componentes shadcn vía CLI oficial.**
8. **Si rompo algo, decirlo.** Sin silenciar excepciones.
9. **Comentarios solo para el "por qué", no el "qué".**

### SÍ puedo hacer sin pedir permiso:
- Crear/editar archivos dentro del scope de la tarea.
- Correr dev server, linter, tests.
- Hacer commits descriptivos en rama de trabajo.

### NO puedo sin pedir permiso:
- Instalar dependencias.
- Tocar CLAUDE.md, package.json, migrations aplicadas.
- Push directo a `main`.
- Borrar archivos.

---

## 9. Estado actual

- [x] **Fase 0** — Setup base (repo, Next.js, Supabase, Vercel)
- [ ] **Fase 1** — Autenticación (signup, login, logout, middleware)
- [ ] **Fase 2** — Vista pública del diplomado y bloques
- [ ] **Fase 3** — Suscripción Stripe + desbloqueo de bloques
- [ ] **Fase 4** — Reproductor de módulo con las 5 partes + progreso
- [ ] **Fase 5** — Quizzes, certificados y rangos
- [ ] **Fase 6** — Comunidad / foro
- [ ] **Fase 7** — Sesiones en vivo (MasterClass / Activación / Mentoría)
- [ ] **Fase 8** — Tutor IA con RAG

---

## 10. Glosario del dominio

- **Pastor / alumno** — usuario final, suscriptor.
- **Diplomado** — el programa completo de 18 meses.
- **Bloque** — uno de los 9 grandes temas (2 meses cada uno). Equivale a un "trimestre" en otros LMS.
- **Módulo** — una clase de 45–60 min con 5 partes fijas. Hay 200 en total (22 por bloque, 24 en el último).
- **Sección / parte** — una de las 5 partes obligatorias de cada módulo (intro, enseñanza, activación, evaluación, impartición).
- **Rango** — título ministerial otorgado al completar un bloque (Discípulo → Enviado).
- **MasterClass** — sesión en vivo de los miércoles.
- **Activación** — sesión práctica en vivo de los viernes.
- **Mentoría grupal** — sesión mensual con grupo reducido.
- **Suscripción** — la subscription de Stripe del alumno ($25/mes).
- **Drip** — sistema de liberación gradual: cada 2 meses pagados se desbloquea 1 bloque.

---

## 11. Decisiones tomadas

| Decisión | Por qué |
|----------|---------|
| Suscripción mensual sobre pago por bloque | Más accesible para pastor latinoamericano. MRR predecible. Alineado con el ritmo de consumo del programa. |
| Modelo Netflix (cancela = pierde acceso) | Más simple operacionalmente. Progreso del alumno se conserva si reactiva. |
| Drip por bloque (1 cada 2 meses) | Evita que el alumno consuma todo en un mes y cancele. Mantiene la disciplina del diplomado. |
| 5 partes fijas por módulo | Estandariza la experiencia. Permite plantillas, métricas comparables, certificación clara. |
| Lanzamiento con los 9 bloques completos | Decisión del usuario. Implica 12–18 meses de producción antes del lanzamiento. Ver PLAN-IMPLEMENTACION sección "Estrategia de lanzamiento" para riesgos. |
| Stripe Subscriptions sobre Checkout one-time | El modelo de cobro lo requiere. Stripe maneja renovaciones, fallos de tarjeta, cancelaciones. |
| Mux sobre Cloudflare Stream | Mejor player, analítica más detallada, posicionamiento premium del producto lo justifica. |
