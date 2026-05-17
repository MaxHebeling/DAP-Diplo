# CLAUDE.md — DAP (Diplomado Apostólico para Pastores)

> **Lee este archivo COMPLETO al inicio de cada sesión antes de escribir código.**
> Si algo aquí entra en conflicto con lo que el usuario te pida, pregunta antes de seguir.

---

## 1. Qué es DAP

DAP es una plataforma web de educación online (LMS) para pastores que quieren formarse en doctrina apostólica. El producto es propiedad 100% del usuario (Max Hebeling) — no es un wrapper de Thinkific/Kajabi. El código vive en este repo y se despliega como app independiente.

**Audiencia:** pastores y líderes ministeriales hispanohablantes (LATAM y España principalmente).

**Idioma del producto:** español (UI, emails, documentación visible al usuario). El código y los nombres de variables/tablas van en inglés (convención estándar).

---

## 2. Modelo de negocio

- **Venta por módulo / nivel.** Cada módulo del diplomado se vende por separado vía Stripe checkout. Un alumno puede comprar un módulo, varios, o todos.
- **Autoinscripción a su propio ritmo.** No hay cohortes con fechas fijas. Cada alumno avanza cuando puede.
- **Acceso permanente** tras la compra (no expira). Si en el futuro se cambia esto, modificar `enrollments.expires_at`.

---

## 3. Stack técnico (no cambiar sin consultar)

| Capa | Herramienta | Notas |
|------|-------------|-------|
| Framework | **Next.js 15** (App Router) | TypeScript estricto. Server Components por defecto. |
| Estilos | **Tailwind CSS** + **shadcn/ui** | shadcn se copia al repo (no es dependencia externa). |
| Base de datos | **Supabase (Postgres)** | Auth + DB + Storage en el mismo servicio. |
| Auth | **Supabase Auth** | Email + password al inicio. Magic link opcional luego. |
| Video | **Mux** | Player y streaming. NUNCA hostear video en Supabase Storage. |
| Pagos | **Stripe** | Checkout sessions + webhooks. Modo test al desarrollar. |
| Email transaccional | **Resend** | Compras, certificados, recuperación de password. |
| Hosting | **Vercel** | Deploy automático desde `main`. Preview en cada PR. |
| Dominio | (TBD) | Probablemente dap.com.[tld] del usuario. |
| Tutor IA (Fase 5) | **Claude API + Supabase pgvector** | RAG con materiales del usuario. |

**Versiones mínimas:** Node 20+, npm o pnpm, Postgres 15+ (lo que use Supabase).

---

## 4. Convenciones de código

### Estructura de carpetas
```
/app                      # Rutas Next.js (App Router)
  /(public)               # Rutas públicas (landing, login, signup)
  /(student)              # Rutas autenticadas del alumno
  /(admin)                # Rutas del admin (Max)
  /api                    # Route handlers (webhooks, etc.)
/components
  /ui                     # Componentes shadcn (no editar a mano)
  /[feature]              # Componentes por feature (course, lesson, quiz)
/lib
  /supabase               # Cliente Supabase (server y browser)
  /stripe                 # Helpers Stripe
  /mux                    # Helpers Mux
  /utils                  # Utilities sueltos
/types                    # Tipos TypeScript compartidos
/supabase
  /migrations             # SQL migrations versionadas
  /seed.sql               # Datos de ejemplo para desarrollo
```

### Reglas firmes
- **TypeScript estricto.** `strict: true` en tsconfig. Nada de `any` sin un comentario justificándolo.
- **Server Components por defecto.** Solo agregar `"use client"` cuando se necesite interactividad real.
- **Datos del lado servidor.** Lectura desde Supabase se hace en Server Components con `createServerClient`. Nunca exponer `service_role_key` al cliente.
- **RLS (Row Level Security) activado en TODAS las tablas.** Si una nueva tabla no tiene policies, no se mergea.
- **Validación con Zod.** Todos los inputs de formulario y API se validan con Zod antes de tocar DB.
- **Nombres en inglés.** Tablas, columnas, funciones, variables: inglés. Textos visibles al usuario: español.
- **Imports absolutos.** Usar alias `@/` desde la raíz (configurado en tsconfig).
- **Sin librerías exóticas.** Antes de instalar algo nuevo, preguntar si se puede resolver con el stack actual.
- **Tests cuando hay lógica de negocio.** No exigir tests para UI pura. Sí para: cálculos de progreso, generación de certificados, webhooks de Stripe, cualquier cosa que cobre dinero.

### Estilo de commits
Conventional Commits:
- `feat: añadir página de detalle de módulo`
- `fix: corregir cálculo de progreso cuando lección no tiene quiz`
- `chore: actualizar dependencias`
- `docs: ampliar plan de implementación`

---

## 5. Modelo de datos (resumen)

Tablas principales. El esquema completo está en `/supabase/migrations/`.

- **profiles** — extiende `auth.users` con datos del pastor (nombre, ministerio, país, teléfono, etc).
- **modules** — módulos del diplomado (ej. "Fundamentos Apostólicos", "Liderazgo Pastoral"). Tienen `price_cents`, `stripe_price_id`, `order`.
- **lessons** — lecciones dentro de un módulo. Tienen `mux_playback_id` para el video y `order`.
- **lesson_resources** — PDFs, audios, links descargables por lección.
- **enrollments** — registro de qué módulos compró cada alumno. Una fila por alumno+módulo.
- **lesson_progress** — qué lecciones ha completado cada alumno y cuándo.
- **quizzes** — un quiz por lección (opcional) o por módulo (examen).
- **quiz_questions** — preguntas del quiz (multiple choice o V/F al inicio).
- **quiz_attempts** — intentos del alumno con puntaje.
- **certificates** — generados cuando termina un módulo. Tienen un código único verificable.
- **forum_threads** / **forum_posts** — comunidad entre pastores (Fase 3).
- **live_sessions** — clases en vivo programadas (Fase 4).
- **ai_conversations** / **ai_messages** — historial del tutor IA (Fase 5).
- **ai_documents** — documentos vectorizados para RAG del tutor IA (Fase 5).

---

## 6. Cómo trabajar conmigo (Claude Code)

### Reglas para mí cuando me pidan código:

1. **Antes de tocar código, leer este archivo y el README.** Si una tarea contradice estas reglas, preguntar primero.
2. **Una feature a la vez.** No "implementa todo el LMS". Una pantalla, una API, un flujo.
3. **Mostrar el plan antes del código** si la tarea toca más de 3 archivos. El usuario aprueba, después implemento.
4. **Migraciones de DB son inmutables.** Una vez creada y aplicada, no editarla — crear una nueva.
5. **Nunca commitear secretos.** Variables sensibles van en `.env.local` (gitignored) y en Vercel/GitHub Secrets.
6. **Nunca correr `npm install` sin confirmar la librería.** El usuario revisa qué se agrega al `package.json`.
7. **Cuando agrego un componente shadcn**, usar el CLI oficial: `npx shadcn@latest add [componente]`. No copiar manualmente.
8. **Si rompo algo, decirlo.** No esconder un error. No usar `try/catch` para silenciar excepciones — siempre loguear o re-lanzar.
9. **Comentarios en código solo cuando explican el "por qué", no el "qué".** El qué se lee del código.

### Cosas que SÍ puedo hacer sin pedir permiso:
- Crear o editar archivos dentro del scope de la tarea pedida.
- Correr el dev server (`npm run dev`).
- Correr migraciones de Supabase en local.
- Correr linter, formatter, tests.
- Hacer commits descriptivos en una rama de trabajo.

### Cosas que NO puedo hacer sin pedir permiso:
- Instalar dependencias nuevas.
- Tocar archivos fuera del scope (especialmente CLAUDE.md, package.json, schema SQL ya aplicado).
- Hacer push a `main` directo.
- Borrar archivos.
- Cambiar variables de entorno o configuración de despliegue.

---

## 7. Variables de entorno

Lista de variables que el repo necesita. Las reales viven en `.env.local` (gitignored) y en Vercel.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo server, nunca al cliente

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Mux
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
EMAIL_FROM=DAP <hola@dap.tudominio>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000  # cambia en prod

# Claude (Fase 5)
ANTHROPIC_API_KEY=
```

---

## 8. Estado actual del proyecto

> Actualizar este apartado al final de cada fase. Mantiene a Claude Code orientado.

- [ ] **Fase 0** — Setup base (repo, Next.js, Supabase, Vercel)
- [ ] **Fase 1** — MVP core (auth, módulos, video, progreso, pago Stripe)
- [ ] **Fase 2** — Exámenes y certificados
- [ ] **Fase 3** — Comunidad / foro
- [ ] **Fase 4** — Sesiones en vivo
- [ ] **Fase 5** — Tutor IA con RAG

---

## 9. Glosario del dominio

- **Pastor / alumno** — usuario final, comprador.
- **Módulo** — bloque temático del diplomado (se vende como unidad). Equivale a un "curso" en otros LMS.
- **Lección** — unidad de contenido dentro de un módulo (video + recursos + quiz opcional).
- **Diplomado** — el programa completo (suma de todos los módulos). El alumno se "diploma" cuando completa todos.
- **Inscripción (enrollment)** — registro de compra de un módulo por un alumno.
- **Examen** — quiz final de un módulo, obligatorio para obtener el certificado.
- **Certificado** — PDF descargable con código verificable, emitido al completar un módulo.

---

## 10. Decisiones tomadas (y por qué)

| Decisión | Por qué |
|----------|---------|
| Next.js sobre Remix/Astro | Mejor soporte para apps full-stack con auth/pagos, mayor ecosistema, Server Components. |
| Supabase sobre Firebase/Neon | Postgres real, RLS robusto, auth integrado, storage. |
| Mux sobre Vimeo/Cloudflare Stream | Mejor analítica, player más limpio, API más madura. Se puede cambiar a Cloudflare más tarde si baja presupuesto. |
| RLS en lugar de checks en código | Una sola fuente de verdad de quién puede leer qué. Imposible saltarse desde el cliente. |
| Stripe checkout hosted vs custom | Más rápido de implementar, PCI-compliant out of the box, mejor en LATAM con métodos locales. |
| Sin cohortes en MVP | El usuario eligió autoinscripción. Si después se quiere cohortes, se añade una tabla `cohorts` y FK opcional en `enrollments`. |
| Comunidad y tutor IA dentro del mismo repo | No fragmentar el producto. Si más adelante crece, se puede separar el tutor a un microservicio. |
