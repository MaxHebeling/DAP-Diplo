# CLAUDE.md — DAP (Diplomado Apostólico Pastoral)

> **Lee este archivo COMPLETO al inicio de cada sesión antes de escribir código.**
> Si algo aquí entra en conflicto con lo que el usuario te pida, pregunta antes de seguir.
>
> **Versión 3.3** — admisión formal + calendario semanal personal (sin gating ni pausa de cobro). 72 módulos. Ver §12 para el historial de cambios.

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
| Framework | Next.js 15 (App Router) |
| Estilos | Tailwind + shadcn/ui (`/components/ui`) + componentes DAP (`/components/ui-dap`) según `DESIGN-SYSTEM.md` |
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
| **profiles** | Datos del pastor (extiende auth.users). Campos clave: `program_start_date`, `matricula`, `admission_status`. |
| **admissions** | Solicitud de admisión: datos personales, pertenencia, carta de consentimiento, estado, carta PDF emitida. |
| **blocks** | Los 9 bloques temáticos. |
| **ranks** | Los 9 rangos. |
| **modules** | 72 clases. Tiene `course_week` (1–72) que indica en qué semana del programa se abre. |
| **module_sections** | Las 5 partes obligatorias de cada módulo. |
| **module_resources** | PDFs, audios, descargables. |
| **subscriptions** | Stripe Subscription por usuario. Campos: `status`, `stripe_subscription_id`, periods. Simple, sin pausa ni gating. |
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
RESEND_API_KEY=
EMAIL_FROM=DAP <hola@dapglobal.org>
EMAIL_ADMISSIONS=admisiones@dapglobal.org   # recibe las solicitudes de admisión
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=
CRON_SECRET=                                 # autentica los crons (admisión 24h, apertura semanal, corrección 48h)
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
