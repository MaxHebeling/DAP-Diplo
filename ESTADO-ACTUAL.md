> ⚠️ **OBSOLETO** — este documento describe el modelo v3 (gating mensual,
> 200 módulos, `months_paid_total`, pausa automática). El modelo final
> es **v3.3** (admisión + calendario semanal, 72 módulos, suscripción
> simple sin pausa). Ver `CLAUDE.md` v3.3 para el estado vigente.
>
> Conservado solo como referencia histórica del MVP de mayo 2026.

---

# Estado actual del DAP — 2026-05-18 (snapshot obsoleto)

## 1. Resumen ejecutivo

**Producto:** Diplomado Apostólico Pastoral (DAP), plataforma de formación de 18 meses para pastores hispanohablantes, suscripción $25 USD/mes, 9 fases × ~22 módulos = 200 módulos totales.

**Estado de la plataforma (capa técnica):** MVP end-to-end **funcional**. Las 8 fases del plan original están implementadas: auth, landing, suscripción Stripe con drip, reproductor de módulos con Mux, quizzes con cascada de rangos y certificados PDF, comunidad/foro moderado, sesiones en vivo con recordatorio cron, tutor IA RAG con Claude streaming.

**Lo que falta para lanzar al mercado:** (a) **contenido** de los 200 módulos (markdown + video Mux) — actualmente 0/1000 secciones tienen body o video; (b) **diseño visual final del PDF del certificado** (el actual es placeholder); (c) imágenes de portada de las 9 fases; (d) PDFs de doctrina para el tutor IA (actualmente 1 doc de prueba); (e) decisión de dominio propio y migración desde `dap-diplo.vercel.app`.

---

## 2. Modelo de negocio

| | |
|---|---|
| Tipo de oferta | Suscripción mensual recurrente |
| Precio | $25 USD/mes |
| Duración total | 18 meses (450 USD si paga todo) |
| Drip | 1 fase nueva cada 2 meses de suscripción activa. Función SQL `unlock_next_phase_if_needed()` calcula `target = least(9, ceil(months_paid_total / 2.0))` |
| Política post-cancelación | **Modelo Netflix**: cancela → pierde acceso a fases. Si reactiva, retoma desde la fase que le corresponde por meses pagados. Progreso preservado en `module_progress` y `section_progress` |
| Trial | No configurado |
| Cupones | No configurados |
| Stripe Product | (env `STRIPE_DAP_SUBSCRIPTION_PRICE_ID`) |
| Webhook events procesados | `customer.subscription.{created,updated,deleted}`, `invoice.{paid,payment_failed}` — idempotencia vía `stripe_events_processed` |

---

## 3. Plan de estudios

**Estructura:** 9 fases × 22 módulos (la fase 9 tiene 24) = **200 módulos totales**. Cada módulo tiene **5 partes fijas**: Intro, Enseñanza, Activación, Evaluación, Impartición.

| # | Slug | Nombre | Módulos | Otorga dimensión | Mes ≈ desbloqueo |
|---|---|---|---|---|---|
| 1 | fundamentos-espirituales | Fundamentos Espirituales | 22 | Discípulo | Mes 0 (inicial) |
| 2 | identidad-y-caracter | Identidad y Carácter | 22 | Hijo | Mes 2 |
| 3 | liderazgo-y-discipulado | Liderazgo y Discipulado | 22 | Líder | Mes 4 |
| 4 | ministerio-y-pastorado | Ministerio y Pastorado | 22 | Ministro | Mes 6 |
| 5 | administracion-y-gobierno | Administración y Gobierno | 22 | Administrador | Mes 8 |
| 6 | finanzas-y-economia-del-reino | Finanzas y Economía del Reino | 22 | Mayordomo | Mes 10 |
| 7 | empresas-y-expansion | Empresas y Expansión | 22 | Reformador | Mes 12 |
| 8 | tecnologia-ia-y-comunicacion | Tecnología, IA y Comunicación | 22 | Arquitecto | Mes 14 |
| 9 | gobierno-apostolico-y-reforma | Gobierno Apostólico y Reforma | 24 | Enviado | Mes 16 |

**Cadencia semanal (documentada en CLAUDE.md, no implementada como producto):** lunes clase grabada premium, miércoles MasterClass en vivo, viernes Activación, mensual Mentoría grupal. El backend para sesiones en vivo (`live_sessions` table + admin + cron de recordatorios) **sí existe**.

---

## 4. Sistema de rangos (Dimensiones)

| Orden | Nombre | Otorga al completar |
|---|---|---|
| 1 | Discípulo | Fase 1 |
| 2 | Hijo | Fase 2 |
| 3 | Líder | Fase 3 |
| 4 | **Ministro** | Fase 4 |
| 5 | Administrador | Fase 5 |
| 6 | Mayordomo | Fase 6 |
| 7 | Reformador | Fase 7 |
| 8 | Arquitecto | Fase 8 |
| 9 | Enviado | Fase 9 |

> Nota: la nomenclatura en código y BD es `dimensions` / `student_dimensions` (renombrado desde `ranks` en migration 0020). "Pastor" se renombró a **Ministro**. En UI español se muestra "Dimensión" (no "Rango").

---

## 5. Stack técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.6 |
| Runtime | React | 19.2.4 |
| Lenguaje | TypeScript strict | 5.x |
| Styling | Tailwind CSS v4 + shadcn/ui (preset base-nova) | 4.x |
| UI primitives | Base UI (no Radix) | @base-ui/react 1.4.1 |
| DB + Auth | Supabase (Postgres + Auth + Storage) | @supabase/ssr 0.10.3, @supabase/supabase-js 2.105.4 |
| Video | Mux (upload + playback) | @mux/mux-node 14.0.1, @mux/mux-player-react 3.13.0, @mux/mux-uploader-react 1.5.0 |
| Pagos | Stripe Subscriptions | stripe 22.1.1 |
| Email | Resend (HTTP directo) | (sin SDK) |
| AI Streaming | Vercel AI SDK + Anthropic provider | ai 6.0.185, @ai-sdk/anthropic 3.0.78, @ai-sdk/react 3.0.187 |
| Embeddings | Voyage AI voyage-3-large (1024-dim) | (HTTP directo) |
| Vector DB | pgvector (Supabase extension) | — |
| PDF render | @react-pdf/renderer | 4.5.1 |
| PDF extract | unpdf (serverless-friendly) | 1.6.2 |
| Forms | react-hook-form + Zod 4 + standardSchemaResolver | 7.76.0 / 4.4.3 |
| Markdown | react-markdown | 10.1.0 |
| Animations | motion (Framer) | 12.38.0 |
| Toasts | sonner | 2.0.7 |
| Hosting | Vercel (Production: dap-diplo.vercel.app) | — |
| Cron | Vercel Cron (cada 15min) | vercel.json |

**Variables de entorno definidas en `.env.example`:**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_DAP_SUBSCRIPTION_PRICE_ID

# Mux
MUX_TOKEN_ID
MUX_TOKEN_SECRET
MUX_WEBHOOK_SECRET

# Resend
RESEND_API_KEY
EMAIL_FROM

# App
NEXT_PUBLIC_APP_URL

# Anthropic (Fase 8)
ANTHROPIC_API_KEY
```

**Variables en uso reales en producción adicionales a `.env.example`:** `CRON_SECRET` (gate del endpoint de recordatorios), `VOYAGE_API_KEY` (embeddings RAG). **`.env.example` está desactualizado** y no las lista.

---

## 6. Estado por fase del plan original

| Fase | Estado | % | Falta para cerrar |
|---|---|---|---|
| 0 — Setup | ✅ Completa | 100% | — |
| 1 — Auth + DB + middleware | ✅ Completa | 100% | — |
| 2 — Landing + fases públicas | ✅ Completa | 100% | Imágenes reales de portada de las 9 fases (todas en NULL) |
| 3 — Stripe Subscription + drip + Customer Portal | ✅ Completa | 100% | — |
| 4 — Reproductor + admin CRUD + upload Mux | ✅ Completa | 100% | **Poblar contenido** (0/1000 secciones tienen body_md o mux_playback_id) |
| 5 — Quizzes + cert + email + /verificar | 🟡 Parcial | 90% | **Diseño visual del PDF del certificado** (el actual es placeholder con borde + texto plano) |
| 6 — Comunidad | ✅ Completa | 100% | — |
| 7 — Sesiones en vivo + cron recordatorios | ✅ Completa | 100% | — |
| 8 — Tutor IA RAG + chat streaming | ✅ Completa | 100% | Ingestar PDFs reales de doctrina (actualmente 1 PDF de prueba "test1" sobre NEHIA) |

**Funcionalmente todas las fases tienen los wireframes de plataforma terminados.** Lo que falta no es código, es **contenido** (módulos + cert design + docs RAG).

---

## 7. Rutas implementadas

| Ruta | Tipo | Estado | Notas |
|---|---|---|---|
| `/` | pública | ✅ | Landing con hero, paleta navy/coral, CTA suscribirse |
| `/login` | pública | ✅ | Auth con redirect |
| `/signup` | pública | ✅ | Registro con metadata (full_name, ministry, country) |
| `/fases/[slug]` | pública | ✅ | Detalle de fase con módulos + CTA suscribirse |
| `/suscribirme` | pública | ✅ | Inicia checkout Stripe |
| `/suscribirme/exito` | pública | ✅ | Post-checkout success |
| `/verificar/[code]` | pública | ✅ | Validación pública de certificados (signed URL 5min) |
| `/dashboard` | student | ✅ | Acceso a fases desbloqueadas |
| `/fases/[phaseSlug]/modulos/[moduleSlug]` | student | ✅ | Reproductor de módulo con stepper 5 secciones |
| `/comunidad` | student | ✅ | Foro listado con filtro por fase |
| `/comunidad/nuevo` | student | ✅ | Crear hilo con MarkdownEditor |
| `/comunidad/[id]` | student | ✅ | Hilo + posts + reply form + reportar |
| `/comunidad/[id]/editar` | student | ✅ | Editar hilo (autor o admin) |
| `/en-vivo` | student | ✅ | Tabs Próximas / Grabaciones + modal Mux |
| `/tutor` | student | ✅ | Index del tutor IA |
| `/tutor/[id]` | student | ✅ | Chat streaming con Claude + sidebar conversaciones |
| `/admin` | admin | ✅ | Redirect a /admin/fases |
| `/admin/fases` | admin | ✅ | Tabla CRUD fases + portada |
| `/admin/fases/[id]/editar` | admin | ✅ | Form fase |
| `/admin/fases/[id]/modulos` | admin | ✅ | Tabla módulos con % poblado |
| `/admin/fases/[id]/modulos/[mid]/editar` | admin | ✅ | Form módulo (8 campos) |
| `/admin/fases/[id]/modulos/[mid]/secciones` | admin | ✅ | Lista 5 secciones + estado |
| `/admin/fases/[id]/modulos/[mid]/secciones/[sid]/editar` | admin | ✅ | Form sección + MarkdownEditor + Mux upload + QuizEditor (si evaluation) |
| `/admin/comunidad` | admin | ✅ | Moderación: pin/close/hide + reportes |
| `/admin/en-vivo` | admin | ✅ | Tabla sesiones con filtro próximas/pasadas/todas |
| `/admin/en-vivo/nuevo` | admin | ✅ | Form crear sesión |
| `/admin/en-vivo/[id]/editar` | admin | ✅ | Form editar + campos de grabación |
| `/admin/tutor/documentos` | admin | ✅ | Ingest PDFs RAG + tabla docs |
| `/api/checkout/create-subscription` | api | ✅ | POST → Stripe Checkout session |
| `/api/billing/portal` | api | ✅ | POST → Stripe Customer Portal |
| `/api/webhooks/stripe` | api | ✅ | POST 5 eventos + idempotencia |
| `/api/webhooks/mux` | api | ✅ | POST asset_created + asset.ready |
| `/api/mux/create-upload` | api | ✅ | POST signed upload URL |
| `/api/quizzes/[quizId]/submit` | api | ✅ | POST grading + cascada |
| `/api/admin/certificates/[id]/regenerate` | api | ✅ | POST forzar regenerar PDF |
| `/api/admin/tutor/upload-url` | api | ✅ | POST signed upload PDF |
| `/api/admin/tutor/ingest` | api | ✅ | POST chunkear + embed + persistir |
| `/api/tutor/chat` | api | ✅ | POST stream Claude + RAG retrieval |
| `/api/cron/live-reminders` | api (cron) | ✅ | GET cada 15min con CRON_SECRET |

**Páginas de marketing que NO existen** (podrían ser útiles): `/precios`, `/faq`, `/contacto`, `/terminos`, `/privacidad`.

---

## 8. Schema de base de datos

**25 tablas en `public`. RLS activado en TODAS.**

| Tabla | Cols | RLS | Filas reales | Propósito |
|---|---|---|---|---|
| `profiles` | 11 | ✅ | 1 | Datos del user (full_name, country, role, current_dimension_id, stripe_customer_id) |
| `phases` | 12 | ✅ | 9 | Las 9 fases del diplomado, todas published, sin cover_image_url |
| `dimensions` | 6 | ✅ | 9 | Los 9 rangos ministeriales (Discípulo → Enviado) |
| `student_dimensions` | 5 | ✅ | 1 | Histórico de dimensiones otorgadas (test) |
| `modules` | 14 | ✅ | 200 | Módulos sembrados (slug, title, subtitle, descripción, etc.) — sin contenido populated |
| `module_sections` | 12 | ✅ | 1000 | 5 secciones por módulo, **0 con body_md, 0 con video** |
| `module_resources` | 8 | ✅ | 0 | PDFs/audios adjuntos a módulos |
| `phase_access` | 5 | ✅ | 1 | Desbloqueos por suscripción (drip) |
| `module_progress` | 6 | ✅ | 22 completed | Test data de Max para validar cascada |
| `section_progress` | 8 | ✅ | 4 completed | Test data |
| `subscriptions` | 15 | ✅ | 1 activa | Stripe sync (status, current_period, cancel_at, months_paid_total) |
| `stripe_events_processed` | 3 | ✅ | n/a | Idempotencia webhooks |
| `quizzes` | 8 | ✅ | 1 | 1 quiz de prueba (Panorama bíblico) |
| `quiz_questions` | 8 | ✅ | 5 | Preguntas del quiz de prueba |
| `quiz_attempts` | 8 | ✅ | 2 | Intentos de Max |
| `certificates` | 8 | ✅ | 1 | Test cert 0B2FA361 |
| `live_sessions` | 13 | ✅ | 2 | 2 sesiones de prueba |
| `forum_threads` | 10 | ✅ | 2 | 2 hilos test |
| `forum_posts` | 7 | ✅ | 2 | 2 posts test |
| `forum_reports` | 8 | ✅ | 0 pendientes | Tabla de moderación |
| `ai_conversations` | 5 | ✅ | 1 | Conversación de prueba con tutor |
| `ai_messages` | 6 | ✅ | 7 | Mensajes user/assistant |
| `ai_rate_limit` | 3 | ✅ | n/a | 30 msg/día por user |
| `ai_document_sources` | 8 | ✅ | 1 | "test1" PDF (NEHIA) |
| `ai_documents` | 9 | ✅ | 61 | Chunks del PDF de prueba con embedding vector(1024) |

**Funciones SQL relevantes:** `has_active_subscription`, `has_phase_access`, `is_admin`, `unlock_next_phase_if_needed`, `complete_phase_if_done`, `verify_certificate`, `match_documents`, `check_and_increment_ai_rate`, `bump_thread_updated_at_on_post`. Todas `SECURITY DEFINER` con `search_path` explícito.

**Migrations aplicadas en Supabase: 22 (0001-0020, dos versiones de 0010 y 0020).** ⚠️ El folder local `supabase/migrations/` solo contiene 0001-0007. Las migrations 0008-0020 se aplicaron via Supabase MCP directamente y no están en git. **Inconsistencia importante** (ver §13).

---

## 9. Integraciones externas

| Integración | Estado | Maneja | Falta |
|---|---|---|---|
| **Stripe** | ✅ Test mode | Subscriptions $25/mes, webhooks 5 eventos, Customer Portal, idempotencia | Switch a Live mode (key actual es `sk_test_*`), configurar Tax si se requiere |
| **Supabase** | ✅ Producción | Auth, DB con 25 tablas, Storage (buckets: blocks-covers, certificates, ai-documents), pgvector | — |
| **Mux** | ✅ Producción | Upload directo desde admin + webhook asset.ready, playback en módulos | — |
| **Resend** | ✅ Producción con dominio dapglobal.org | Welcome email, certificate email, session reminder email | — |
| **Vercel** | ✅ Producción | Hosting, Cron `/api/cron/live-reminders` cada 15min, env vars sync | Conectar dominio propio (hoy `dap-diplo.vercel.app`) |
| **Anthropic Claude** | ✅ Producción | claude-sonnet-4-6 streaming via Vercel AI SDK | — |
| **Voyage AI** | ✅ Producción (payment method añadido) | voyage-3-large embeddings 1024-dim | — |

---

## 10. Lo que un alumno puede hacer HOY (end-to-end)

1. ✅ Visitar la landing en `dap-diplo.vercel.app`
2. ✅ Registrarse (signup con metadata)
3. ✅ Iniciar sesión
4. ✅ Ver las 9 fases en la landing (sin imágenes de portada)
5. ✅ Ver detalle de una fase (`/fases/[slug]`)
6. ✅ Iniciar checkout de suscripción ($25/mes test)
7. ✅ Recibir email de bienvenida (Resend desde `office@dapglobal.org`)
8. ✅ Ver fase desbloqueada en `/dashboard`
9. ✅ Entrar a un módulo (`/fases/.../modulos/...`)
10. ⏳ Ver video de la lección — **NO** (0 módulos tienen video subido)
11. ⏳ Leer markdown de la lección — **NO** (0 secciones tienen `body_md`)
12. 🟡 Hacer quiz — solo posible en *Panorama bíblico* (el único quiz creado)
13. ⏳ Recibir certificado — solo si completas los 22 módulos de Fase 1; el PDF se emite pero con diseño placeholder
14. ✅ Ver dimensión otorgada (refleja en `profiles.current_dimension_id`)
15. ✅ Participar en comunidad: crear hilos, responder, reportar posts
16. ✅ Ver sesiones en vivo programadas + abrir Zoom + ver grabaciones (si existen)
17. ✅ Usar tutor IA — responde solo sobre el PDF "test1" ingestado, dice "no encontré información" para lo demás

**Bloqueador real para el alumno:** sin contenido en los módulos (10 y 11), la experiencia educativa principal está vacía.

---

## 11. Lo que un admin puede hacer HOY

1. ✅ Login con `role=admin` (RLS auto-permite todo)
2. ✅ Acceder a `/admin` → redirect a `/admin/fases`
3. ✅ CRUD de fases (title, slug, subtitle, descripción, portada, published, months_duration, dimension_id)
4. ✅ CRUD de módulos (8 campos: title, subtitle, descripción, objetivo, revelación principal, frase impartición, duración, free preview)
5. ✅ CRUD de secciones (MarkdownEditor con preview, Mux upload directo, mux_playback_id manual fallback)
6. ✅ Subir videos a Mux desde el admin (signed URL + webhook auto-popula playback_id)
7. ✅ Crear quizzes inline en sección evaluation (preguntas multiple_choice o true_false)
8. ✅ Moderar comunidad: pin/unpin, close/open, hide (soft delete), resolver reportes
9. ✅ Programar sesiones en vivo (4 kinds), editar, agregar recording_url o mux_playback_id post-sesión
10. ✅ Ingestar documentos PDF para tutor IA (chunkea + embebe + persiste, idempotente con delete)
11. ⏳ Ver dashboards / métricas — **NO existe**, sería trivial agregar (suscriptores activos, MRR, certificados emitidos, etc.)
12. ⏳ Ver/editar listado de usuarios — **NO existe**

---

## 12. Deuda técnica conocida

1. **Diseño visual del PDF del certificado pendiente.** El componente actual `certificate-document.tsx` usa un template basado en el PNG aportado por Max (`public/cert/background-template.png` + máscaras + texto Allura). El posicionamiento aún tiene cosas que iterar (Max lo dejó "para el final" en sesión previa). El flow de generación/firma funciona, lo visual es placeholder.

2. **No hay tests automatizados.** Ni unit ni integration ni E2E. El proyecto se ha validado todo manualmente. Si crece, esto se vuelve crítico.

3. **`scripts/issue-certificate.ts` es el único script ops.** Útil pero ad-hoc. No hay framework de seeders, ni backfills documentados.

4. **No hay analytics / observability.** Sin PostHog, Sentry, Logsnag o equivalente. Errores solo aparecen en logs de Vercel.

5. **No hay rate limiting global** (aparte del de tutor IA). Endpoints como `/api/checkout/create-subscription` o `/api/quizzes/submit` no tienen throttling — un user malicioso podría hammer.

6. **`.env.example` desactualizado:** no incluye `CRON_SECRET` ni `VOYAGE_API_KEY`. Si alguien clona el repo no sabe que necesita estas vars.

7. **Sin sitemap.xml ni robots.txt explícitos** (Next.js sirve defaults pero no están customizados).

8. **No hay manejo de imágenes optimizado en producción.** `unoptimized` está en algunos `<Image>` que apuntan a Supabase Storage. Funciona pero pierde el optimization de Vercel.

9. **No hay copy de Términos y Condiciones / Política de Privacidad.** Necesario para procesar pagos en LATAM y para Stripe compliance.

10. **El recordatorio cron solo manda 1h antes.** No hay recordatorio 24h antes ni 15min antes (no es bug, es alcance limitado de Fase 7.3).

11. **El tutor IA no expone qué chunk usó.** Manda al cliente las 8 fuentes recuperadas como "Fuentes citadas", pero Claude podría haber respondido usando solo 1 de las 8. UX honesta pero podría mejorarse pidiéndole a Claude que cite con `[1]`, `[2]`.

12. **No hay onboarding post-suscripción.** Después del checkout exitoso el alumno aterriza en `/suscribirme/exito` pero no hay tour / wizard / "haz tu primera lección".

13. **Sin notificaciones in-app.** Si alguien te responde un hilo de comunidad o si admin pinea uno tuyo, no te enteras.

14. **Sin búsqueda.** No hay buscador global de módulos, lecciones o foros.

---

## 13. Inconsistencias detectadas

1. **CLAUDE.md está desactualizado tras el rename.** Menciona "Bloques", "Rangos" y "Pastor" en su mayoría. El código actual usa "Fases", "Dimensiones" y "Ministro". Hay que sincronizar la doc.

2. **CLAUDE.md menciona `PLAN-IMPLEMENTACION.md`** (línea ~196) como fuente de verdad para la lista de fases. **Ese archivo no existe** en el repo. El "plan" vive solo en la memoria conversacional del equipo de desarrollo.

3. **Migrations: divergencia local vs servidor.** `supabase/migrations/` local tiene `0001-0007` (7 archivos). Supabase server tiene **22 migrations aplicadas** (0001-0020, con duplicados de 0010 y 0020). Las migrations 0008-0020 se aplicaron vía MCP y nunca se commitearon como `.sql` al repo. Si alguien clona y corre `supabase db reset`, la DB queda incompleta. Hay que generar los 13 archivos faltantes y commitearlos.

4. **`.env.example` no lista `CRON_SECRET` ni `VOYAGE_API_KEY`** que sí están en uso en producción.

5. **CLAUDE.md menciona cadencia semanal lunes/miércoles/viernes/mensual** como parte del producto pero el código no tiene ninguna obligación visible de honrarla. Solo existe `live_sessions` admin CRUD; el "calendario semanal" no está modelado.

6. **Nombre del programa:** sigue siendo "Diplomado Apostólico Pastoral" (DAP). El rango "Pastor" se renombró a "Ministro" pero el programa conserva "Pastoral". Decisión consciente confirmada en el último rename — documentarla en CLAUDE.md.

7. **Las 9 fases tienen `cover_image_url IS NULL`.** La landing renderiza tarjetas sin imagen (fallback gris). El admin permite subir portadas pero ninguna está cargada.

8. **El proxy.ts no protege `/fases/`** intencionalmente (la página hace su propio gating), pero un usuario logueado pero sin suscripción puede entrar a la landing de una fase y ver módulos. El gating real está dentro del player `/fases/[phaseSlug]/modulos/[moduleSlug]` con `has_phase_access`. Esto está OK conceptualmente pero merece mención.

9. **`vercel.json` declara cron `*/15 * * * *`.** En el plan Hobby de Vercel, los crons solo corren 1×/día. Si Max está en Hobby, el recordatorio 1h-antes solo se manda en una ventana de 15min/día — efectivamente roto. Verificar tier.

---

## 14. Bloqueos / decisiones pendientes

1. **Dominio propio.** Hoy todo apunta a `dap-diplo.vercel.app`. Definir dominio (¿`dap.global`? ¿`diplomadoapostolico.com`?) y migrar.
2. **Diseño visual definitivo del PDF del certificado.** Max dijo "para el final".
3. **Imágenes de portada de las 9 fases.** Diseño + producción. Sin esto la landing y el dashboard se ven incompletos.
4. **Contenido real de los 200 módulos** (texto markdown + videos Mux). Es el bloqueador principal de lanzamiento.
5. **PDFs de doctrina** para el tutor IA. Hoy responde solo sobre un PDF unrelated.
6. **Copy de FAQ, Términos, Privacidad.** Páginas legales sin redactar.
7. **Pricing localizado.** $25 USD para LATAM puede ser barrera. ¿Soportar BRL/MXN/ARS con Stripe Tax?
8. **Sistema de cupones / referidos / scholarships.** No modelado.
9. **¿Versión institucional / iglesia?** Para venta a iglesias con N alumnos. Hoy todo es B2C individual.
10. **Decisión sobre cadencia en vivo.** ¿Realmente lunes/miércoles/viernes? Quién lo da, quién lo modera, cuándo arranca.

---

## 15. Próximos pasos según el plan

El plan original (Fases 0-8) está **terminado a nivel de plataforma**. Lo que sigue ya no es desarrollo del MVP, sino:

1. **Carga de contenido** (Fase de contenido, no técnica): poblar los 200 módulos vía `/admin/fases/.../modulos/.../secciones/.../editar`.
2. **Cierre estético del cert PDF** (pendiente Fase 5.4 visual).
3. **Dashboard admin con métricas** (no estaba en el plan original — opcional pero útil).
4. **Onboarding post-checkout** (no estaba en el plan original).
5. **Páginas legales** (Términos, Privacidad, FAQ).
6. **Conectar dominio propio + actualizar referencias hardcoded** (`NEXT_PUBLIC_APP_URL`, emails, PDF cert verifyUrl).
7. **Sincronizar migrations 0008-0020 al folder local** (`supabase/migrations/`) y actualizar README de migrations.
8. **Actualizar CLAUDE.md** post-rename (Bloque→Fase, Rango→Dimensión, Pastor→Ministro) y eliminar referencia al `PLAN-IMPLEMENTACION.md` inexistente.

---

*Documento generado por auditoría del 2026-05-18. Próxima revisión recomendada tras la primera carga real de contenido.*
