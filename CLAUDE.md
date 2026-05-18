# CLAUDE.md — DAP (Diplomado Apostólico Pastoral)

> **Lee este archivo COMPLETO al inicio de cada sesión antes de escribir código.**
> Si algo aquí entra en conflicto con lo que el usuario te pida, pregunta antes de seguir.
>
> **Versión 3** — modelo mensual con gating académico (reemplaza el "drip por bloque cada 2 meses calendario" del v2).

---

## 1. Qué es DAP

DAP (Diplomado Apostólico Pastoral) es una plataforma web de educación premium para pastores y líderes ministeriales hispanohablantes. Es un programa de formación integral de **18 meses** que combina formación espiritual, liderazgo, gobierno, finanzas, empresas y tecnología.

Propiedad 100% del usuario. Código propio, base de datos propia. Posicionamiento visual premium (MasterClass / Apple Education / Hillsong College moderno). Paleta del proyecto: navy + coral.

Idioma del producto: **español**. Idioma del código: **inglés**.

---

## 2. Modelo de negocio

- **Suscripción mensual de $25 USD** vía Stripe Subscription.
- **Ciclo de facturación personal:** si el alumno se inscribe el 5 de mayo, paga el 5 de junio, el 5 de julio, etc. (Stripe maneja esto nativamente).
- **Duración total:** 18 meses académicos (= 200 módulos / ~11 por mes).
- **Costo total:** $450 USD si paga los 18 meses completos.

### Gating académico (regla central del producto)

El acceso al contenido **NO depende solo del pago**. Depende del rendimiento académico del alumno.

- En cada momento, el alumno está en un **mes académico** (`current_month_number`, 1–18).
- En ese mes tiene **11 módulos** disponibles (12 en los meses 17 y 18, que son el Bloque 9).
- Para avanzar al mes siguiente debe cumplir **dos condiciones**:
  1. Haber **pagado** el siguiente mes (Stripe cobra normalmente).
  2. Haber **aprobado** los 11 (o 12) módulos del mes actual.
- Si paga pero no aprobó el mes actual: **queda bloqueado** en el mes actual aunque el pago esté procesado. El sistema acumula `months_paid_total` pero `current_month_number` NO avanza.
- Cuando finalmente aprueba el módulo 11 del mes pendiente, **automáticamente** avanza al mes siguiente (ya estaba pagado). No espera otro pago.
- Mensaje claro al alumno: "Termina los módulos del Mes X para desbloquear el Mes Y."

### "Aprobado" — definición exacta

Un módulo está aprobado cuando se cumplen **ambas**:
- Las **5 secciones** (intro / teaching / activation / evaluation / impartation) tienen `section_progress.completed = true`.
- El **quiz** de la sección de evaluación tiene al menos un `quiz_attempts.passed = true`.

### Cancelación

- Modelo Netflix: cancela suscripción → pierde acceso a todo.
- Si reactiva en cualquier momento: retoma desde donde quedó (su `current_month_number` y todos sus `module_progress` se conservan).

### Pausa automática del cobro (regla central)

El cobro está **condicionado al rendimiento académico**. No se le cobra al alumno si no completó el mes actual.

- ~3 días antes del próximo cobro, Stripe envía el evento `invoice.upcoming`.
- En ese momento el sistema verifica si el alumno completó los 11 (o 12) módulos del mes actual:
  - **Si NO completó:** pausa la suscripción con `pause_collection: { behavior: 'mark_uncollectible' }`. **Stripe NO cobra.** El alumno mantiene acceso al mes actual indefinidamente, sin cargo extra. Email: *"Tu cobro mensual está pausado hasta que completes los módulos pendientes del Mes X."*
  - **Si SÍ completó:** la suscripción queda activa, Stripe cobra normalmente y `try_advance_month` lo avanza al siguiente mes cuando llega `invoice.paid`.
- Cuando el alumno (en cualquier momento futuro) finalmente apruebe el último módulo pendiente, el handler de aprobación detecta la pausa y la **reanuda automáticamente** (`pause_collection: null`). Stripe procesa el cobro pendiente y avanza al siguiente mes.

### Timeout de pausa (60 días)

Para evitar "alumnos zombies" eternos, la pausa tiene un timeout:

- **Día 30 en pausa** → email amable: "Te queremos de vuelta. Tu suscripción se cancelará en 30 días si no retomas."
- **Día 50 en pausa** → email final: "Última semana. Tu suscripción se cancela en 10 días."
- **Día 60 en pausa** → **suscripción se cancela automáticamente** (modelo Netflix completo). Pierde acceso. Su progreso (`module_progress`, `section_progress`, `student_ranks`) se conserva. Si reactiva en el futuro, retoma desde donde quedó.

### Extensión por bloque

El alumno puede solicitar **1 extensión por bloque** (hay 9 bloques en total — máximo 9 extensiones en toda su carrera del DAP):

- Click en el dashboard cuando está pausado: "Pedir 60 días extra para este bloque".
- Razón opcional (texto libre, no se valida automáticamente).
- Se otorga inmediatamente: el timeout efectivo pasa de 60 a 120 días en ese bloque.
- Solo 1 vez por bloque (controlado por tabla `pause_extensions` con UNIQUE constraint).

---

## 3. Estructura del producto

```
Diplomado (18 meses académicos)
  ├── Bloque 1: Fundamentos Espirituales (22 módulos, meses 1–2)
  │     ├── Mes 1 → módulos 1–11 del bloque
  │     └── Mes 2 → módulos 12–22 del bloque
  ├── Bloque 2: Identidad y Carácter (22 módulos, meses 3–4)
  ├── Bloque 3: Liderazgo y Discipulado (22 módulos, meses 5–6)
  ├── Bloque 4: Ministerio y Pastorado (22 módulos, meses 7–8)
  ├── Bloque 5: Administración y Gobierno (22 módulos, meses 9–10)
  ├── Bloque 6: Finanzas y Economía del Reino (22 módulos, meses 11–12)
  ├── Bloque 7: Empresas y Expansión (22 módulos, meses 13–14)
  ├── Bloque 8: Tecnología, IA y Comunicación (22 módulos, meses 15–16)
  └── Bloque 9: Gobierno Apostólico y Reforma (24 módulos, meses 17–18)
                                              (12 módulos por mes, excepción)
                                  Total: 200 módulos
```

### Estructura interna de cada módulo (5 partes obligatorias)

| # | Sección | Contenido típico |
|---|---------|------------------|
| 1 | Introducción | Objetivo, revelación principal, aplicación |
| 2 | Enseñanza | Video principal (45–60 min) |
| 3 | Activación | Ejercicio práctico para aplicar de inmediato |
| 4 | Evaluación | Quiz que mide comprensión (umbral 70%) |
| 5 | Frase de impartición | Palabra apostólica de cierre |

### Cronograma semanal (sesiones en vivo, opcionales)

- **Lunes** → Clase principal grabada premium.
- **Miércoles** → MasterClass en vivo.
- **Viernes** → Activación práctica.
- **Mensual** → Mentoría grupal.

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
| Framework | Next.js 15 (App Router) |
| Estilos | Tailwind + shadcn/ui (paleta navy + coral) |
| Base de datos | Supabase Postgres |
| Auth | Supabase Auth |
| Video | Mux |
| Pagos | Stripe Subscriptions ($25/mes) |
| Email | Resend |
| Hosting | Vercel |
| Tutor IA | Claude API + Supabase pgvector |

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
| **profiles** | Datos del pastor (extiende auth.users). |
| **blocks** | Los 9 bloques temáticos. |
| **ranks** | Los 9 rangos. |
| **modules** | 200 clases. Tiene `course_month` (1–18) que indica en qué mes académico va. |
| **module_sections** | Las 5 partes obligatorias de cada módulo. |
| **module_resources** | PDFs, audios, descargables. |
| **subscriptions** | Stripe Subscription por usuario. Campos clave: `status`, `months_paid_total`, `current_month_number` (1–18), `month_started_at`. |
| **module_progress** | Estado del módulo por usuario (`completed` boolean). |
| **section_progress** | Estado de cada una de las 5 partes por usuario. |
| **student_ranks** | Rangos otorgados a cada alumno. |
| **quizzes / quiz_questions / quiz_attempts** | Evaluación de cada módulo. |
| **certificates** | Certificados por bloque completado. |
| **live_sessions** | MasterClass, Activación, Mentoría. |
| **forum_threads / forum_posts** | Comunidad. |
| **ai_conversations / ai_messages / ai_documents** | Tutor IA. |

### Conceptos que ya NO se usan

- `block_access` → dropeada en migration 0008. Reemplazada por `subscriptions.current_month_number`.
- Función `unlock_next_block_if_needed` → reemplazada por `try_advance_month`.
- Función `has_block_access` → reemplazada por `has_access_to_module`.

### Funciones SQL críticas (definidas en migration 0008)

| Función | Devuelve | Cuándo se llama |
|---------|----------|-----------------|
| `is_module_approved(user_id, module_id)` | bool | Cada vez que se necesita gating de un módulo, o al verificar si un mes está completo. |
| `count_approved_modules_in_month(user_id, month_number)` | int | Para mostrar progreso del mes ("8 de 11 aprobados"). |
| `is_month_completed(user_id, month_number)` | bool | Al intentar avanzar mes. |
| `try_advance_month(user_id)` | int (nuevo current_month_number) | Webhook invoice.paid + cuando se marca aprobado el último módulo del mes. |
| `has_access_to_module(user_id, module_id)` | bool | Gating del reproductor. |
| `has_active_subscription(user_id)` | bool | Acceso general. |
| `should_pause_for_incomplete_month(user_id)` | bool | Webhook `invoice.upcoming` → decidir si pausar el cobro. |
| `is_subscription_paused(user_id)` | bool | UI del dashboard para mostrar el estado. |
| `days_paused(user_id)` | int | Días en pausa (efectivos, descontando extensiones). |
| `should_cancel_for_timeout(user_id)` | bool | Cron diario → ≥60 días en pausa = cancelar. |
| `request_pause_extension(user_id)` | jsonb | Otorga +60 días si no ha extendido este bloque. |
| `mark_subscription_paused(user_id, reason)` | bool | Marca la pausa al recibir `invoice.upcoming`. |
| `mark_subscription_resumed(user_id)` | bool | Quita la pausa al completar el mes. |

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
RESEND_API_KEY=
EMAIL_FROM=DAP <hola@dap.tudominio>
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=
```

---

## 8. Reglas para Claude Code

1. Lee este archivo + PLAN-IMPLEMENTACION.md al inicio de cada sesión.
2. Una feature a la vez.
3. Muestra el plan antes de implementar si toca más de 3 archivos.
4. Migraciones de DB son inmutables una vez aplicadas con datos reales.
5. Nunca commitear secretos.
6. Nunca instalar dependencias sin pedir.
7. shadcn vía CLI oficial.
8. Sin silenciar excepciones.
9. Comentarios solo para "por qué", no "qué".

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
- [x] **Fase 1** — Autenticación
- [ ] **Fase 2** — Vista pública del Diplomado *(parcial: landing OK, falta detalle de bloque)*
- [ ] **Fase 3** — Suscripción Stripe + gating mensual *(arquitectura cambió con migration 0008)*
- [ ] **Fase 4** — Reproductor de módulo con 5 secciones + progreso
- [ ] **Fase 5** — Quizzes, certificados, rangos
- [ ] **Fase 6** — Comunidad
- [ ] **Fase 7** — Sesiones en vivo
- [ ] **Fase 8** — Tutor IA

---

## 10. Glosario

- **Pastor / alumno** → usuario final, suscriptor.
- **Diplomado** → el programa completo de 18 meses académicos.
- **Bloque** → uno de los 9 grandes temas (2 meses académicos cada uno).
- **Mes académico** → unidad de gating. Numerado 1–18 por alumno. Coincide con el ciclo de facturación de Stripe.
- **Módulo** → una clase de 45–60 min con 5 partes fijas. 11 por mes (12 en meses 17–18). Total 200.
- **Sección / parte** → una de las 5 partes obligatorias de cada módulo.
- **Aprobado** → módulo con 5 secciones completadas + quiz pasado.
- **Rango** → título ministerial otorgado al completar un bloque.
- **MasterClass** → sesión en vivo de los miércoles.
- **Activación** → sesión práctica del viernes.
- **Mentoría grupal** → sesión mensual con grupo reducido.

---

## 11. Decisiones tomadas (con razón)

| Decisión | Por qué |
|----------|---------|
| Suscripción mensual personal (5 al 5) | Lo hace Stripe nativamente. Permite gating mes a mes. |
| Gating académico (no temporal) | Asegura rendimiento real, no solo pago. Diferencia el DAP de un Netflix bíblico. |
| Modelo Netflix (cancela = pierde acceso) | Simple operacionalmente. Progreso se conserva si reactiva. |
| Pausa automática si no completó | El cobro está condicionado al rendimiento académico. Más justo para el alumno (no paga si no avanzó) y más simple operacionalmente que devoluciones manuales. |
| Rangos al completar bloque (no mes) | Mantiene los 9 rangos clásicos como hitos visibles. |
| Bloque 9 con 24 módulos (12/mes) | Mantiene el plan curricular original sin recortar. Excepción aceptada. |
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
- **Antes:** los 200 módulos estaban solo agrupados por bloque. **Ahora:** además tienen `course_month` (1–18) que define cuándo se desbloquean.
- **Antes:** rangos se otorgaban al completar bloque, pero no había concepto de "mes académico". **Ahora:** el sistema lleva `current_month_number` y el rango sigue saliendo al completar bloque entero.
