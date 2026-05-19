# PLAN DE EJECUCIÓN — DAP v3.3

> Documento maestro definitivo. Reemplaza `PLAN-IMPLEMENTACION.md` y
> `PROMPTS-ADMISION-CALENDARIO.md` (que tenían partes del modelo viejo).
> Alineado al modelo final v3.3: 72 módulos, calendario semanal personal,
> admisión formal, sin gating ni pausa de cobro.

## Cómo usar este documento

- Las fases van en orden. Cada una tiene: **objetivo**, **pre-requisitos**,
  **prompt(s)** para copiar a Claude Code, y un **checklist de terminada**.
- Pega cada prompt tal cual. Termina y revisa una fase antes de la siguiente.
- Los prompts marcados con 🔑 te pedirán **assets** (logos, firma, material
  de voz). Tenlos a mano.
- Antes de cada prompt, Claude Code debe leer `CLAUDE.md` v3.3.

## Punto de partida (lo que ya está hecho)

- ✅ Schema v3.3 aplicado en Supabase (72 módulos, admissions, calendario).
- ✅ Auth (signup/login/logout) funcionando.
- ✅ Cleanup del modelo viejo (gating/pausa eliminados del código).
- 🟡 Landing existe pero con copy viejo (200 módulos, pausa, miércoles).

## Resumen de fases

| Fase | Objetivo | Assets | Tiempo |
|------|----------|--------|--------|
| 0 | Sincronizar migrations del repo | — | 10 min |
| 1 | Admisión (formulario + gate) | — | 2–3 h |
| 2 | Admin admisiones + carta PDF + cron 24h | 🔑 firma, logos | 3–4 h |
| 3 | Calendario semanal: dashboard + player | — | 3–4 h |
| 4 | Evaluaciones autocorregibles + reveal 48h | — | 2–3 h |
| 5 | Excorrector (tareas IA) + cron 48h | 🔑 material de voz | 3–4 h |
| 6 | Certificados + rangos al completar bloque | — | 3–4 h |
| 7 | Sesiones en vivo (MasterClass por evento) | — | 2–3 h |
| 8 | Comunidad / foro | — | 3 h |
| 9 | Tutor IA (RAG) | 🔑 PDFs/material | 5–7 h |
| 10 | Landing copy + pulido visual | — | 3–4 h |

---

# FASE 0 — Sincronizar migrations del repo

**Objetivo:** que las migrations del repo coincidan con la DB real (v3.3).

```
Termina la consolidación de migrations del repo para que coincida con
la DB real (ya está en v3.3 consolidado en Supabase).

1. Mueve a supabase/migrations/_archive/ las migrations restantes del
   modelo viejo: 0001_initial_schema.sql,
   0003_profiles_stripe_customer_id.sql, 0004_stripe_events_processed.sql,
   0005_unlock_logic.sql, 0006_subscriptions_cancel_at.sql,
   0007_storage_blocks_covers_bucket.sql.
2. Te voy a pegar el schema consolidado v3.3 → créalo como
   supabase/migrations/0001_schema_v3.3_consolidated.sql.
3. Te voy a pegar la migration de eventos Stripe → créala como
   supabase/migrations/0002_stripe_events_processed.sql.
4. El repo queda con SOLO esas 2 migrations. Commit "chore: consolidate
   migrations to v3.3".

NO ejecutes migrations contra Supabase — la DB ya está en v3.3. Esto es
solo sincronizar archivos del repo.
```

(Pégale el contenido de `schema_dap_v3.3_completo.sql` y de
`0002_stripe_events_processed.sql` cuando los pida.)

**Checklist:** repo con 2 migrations activas (0001 consolidado + 0002
stripe), resto en _archive/, commit hecho.

---

# FASE 1 — Admisión (formulario + gate de acceso)

**Objetivo:** el aspirante completa la admisión obligatoria antes de
acceder. Lógica condicional de carta de consentimiento.

**Pre-requisitos:** bucket `consent-letters` (privado) creado en Supabase
Storage.

```
Lee CLAUDE.md v3.3 (sección 2 "Admisión") y el schema (tablas admissions,
profiles.admission_status).

Tarea: formulario de admisión obligatorio post-signup + gate de acceso.

ANTES DE CÓDIGO: confirma que leíste CLAUDE.md v3.3 y muéstrame el plan
de archivos. Espera mi OK.

GATE DE ACCESO (middleware):
- Tras signup, admission_status = 'none'.
- Si un usuario logueado con admission_status != 'approved' intenta
  /dashboard o cualquier módulo → redirige a /admision (si 'none') o a
  /admision/estado (si 'pending'/'under_review'/'rejected').
- Solo 'approved' accede al contenido.

PÁGINA /app/(student)/admision/page.tsx (form, react-hook-form + zod):
1. Datos personales (obligatorios): nombre completo, fecha de nacimiento,
   país (select), ciudad, teléfono (código país), email (precargado).
2. Pertenencia: iglesia, ministerio, profesión, empresa/sector.
3. Pertenencia a la Red: radio "¿Perteneces a la Red Apostólica Reino y
   Avivamiento o a Revival & Kingdom Ministries, INC?" Sí/No.
   - Sí → select de cuál (reino_y_avivamiento / revival_kingdom).
   - No → campo upload OBLIGATORIO: "Carta de consentimiento firmada por
     tu pastor" (PDF/JPG/PNG, máx 10MB) → sube a bucket consent-letters
     (privado) → guarda path en consent_letter_url.

VALIDACIÓN: si belongs_to_network=false → consent_letter_url obligatorio.

AL ENVIAR (server action):
1. INSERT en admissions (status='pending').
2. UPDATE profiles SET admission_status='pending'.
3. Email a EMAIL_ADMISSIONS (admisiones@dapglobal.org) con todos los
   datos + signed URL de la carta de consentimiento si aplica.
4. Redirige a /admision/estado.

PÁGINA /app/(student)/admision/estado/page.tsx:
- pending/under_review: "Tu solicitud está en revisión."
- approved: "¡Felicidades! Tu carta de admisión llegará en 24h." +
  "Tu programa inicia el {program_start_date}".
- rejected: muestra rejection_reason.

REGLAS: TS estricto, estética del DESIGN-SYSTEM (dark, violeta/coral,
glass). No instalar deps sin permiso.

CUANDO TERMINES: prueba registrar usuario → completar admisión sin
pertenencia (sube PDF) → verifica email a admisiones@ y admission_status
='pending' → confirma que middleware bloquea /dashboard.
```

**Checklist:** signup → admisión → email a admisiones@ → estado en
revisión → middleware bloquea hasta aprobación.

---

# FASE 2 — Admin de admisiones + Carta PDF + cron 24h 🔑

**Objetivo:** revisar/aprobar admisiones y emitir carta PDF 24h después.

**Pre-requisitos:** bucket `admission-letters` (privado). `CRON_SECRET`
en Vercel.

```
Lee CLAUDE.md v3.3 (sección "Flujo de admisión").

Tarea: (1) panel admin de admisiones, (2) carta PDF, (3) cron de envío
24h.

🔑 NECESITO ASSETS. Antes de construir el PDF, PÍDELE a Max y espera a
que los ponga en /public/admission-assets/:
   - firma-max-hebeling.png (fondo transparente)
   - logo-red-apostolica.png (color, transparente)
   - logo-dap.png (color, transparente)
No generes el PDF sin ellos.

ANTES DE CÓDIGO: confirma lectura de CLAUDE.md, pídeme los assets,
muéstrame el plan. Espera OK.

PARTE 1 — /app/(admin)/admisiones:
- Tabla filtrable por status (nombre, iglesia, pertenece a red, fecha).
- Detalle /admin/admisiones/[id]: todos los datos + link a carta de
  consentimiento (signed URL).
- Aprobar: status='approved', approved_at=now(), program_start_date =
  (SELECT public.next_tuesday(current_date)), matrícula única
  (DAP-YYYY-XXXXX), UPDATE profiles (admission_status='approved',
  program_start_date, matricula).
- Rechazar: status='rejected' + rejection_reason + email al aspirante.

PARTE 2 — Carta PDF (/lib/admission/generate-letter.ts, @react-pdf/renderer
— pide permiso para instalar):
- generateAdmissionLetter({ fullName, matricula, programStartDate,
  issuedDate }) → Buffer.
- Diseño: hoja blanca carta vertical. Logos Red Apostólica (izq) + DAP
  (der) a color. Bandas sutiles con gradiente violeta→coral arriba/abajo.
  Título "CARTA DE ADMISIÓN". Cuerpo pastoral-formal (2 párrafos):
  admite a {fullName} al Diplomado Apostólico Pastoral. Datos: matrícula,
  fecha emisión, fecha de inicio. Firma: imagen firma-max-hebeling.png +
  "Dr. Max Hebeling / CEO & Apóstol — Red Apostólica Reino y Avivamiento /
  Revival & Kingdom Ministries, INC." Pie: dapglobal.org.
- Subir a bucket admission-letters (privado). Guardar admission_letter_url.

PARTE 3 — Cron 24h:
- vercel.json: cron "/api/cron/admission-letters" cada hora ("0 * * * *").
- Handler (Bearer CRON_SECRET): SELECT admissions WHERE status='approved'
  AND approved_at <= now()-interval '24 hours' AND admission_letter_sent_at
  IS NULL. Para cada una: generar PDF, subir, email al alumno con PDF
  adjunto, set admission_letter_sent_at=now(). Idempotente.

NOTA: el cron corre cada hora, la carta llega dentro de los 60 min tras
cumplirse las 24h. Es lo correcto.

CUANDO TERMINES: aprueba una admisión, ajusta approved_at a hace 25h en
SQL, corre el cron con curl+Bearer, verifica que el PDF se generó y llegó.
Muéstrame el PDF.
```

**Checklist:** admin aprueba → 24h → carta PDF firmada llega al alumno +
program_start_date asignado.

---

# FASE 3 — Calendario semanal: Dashboard + Player

**Objetivo:** el alumno ve su módulo de la semana; la tarea abre martes y
cierra lunes; el contenido pasado queda para repaso.

```
Lee CLAUDE.md v3.3 ("Avance por calendario semanal") y las funciones
current_program_week, has_access_to_module, is_module_week_open.

Tarea: dashboard + player con calendario semanal personal.

ANTES DE CÓDIGO: plan de archivos. Espera OK. Define la timezone del
sistema explícitamente (pregúntame cuál usar; sugiero America/Mexico_City).

==== DASHBOARD /app/(student)/dashboard/page.tsx ====
Server Component. Carga: profile, subscription, current_program_week.
- Hero: "Hola {nombre}. Estás en la Semana {N} de 72." + rango actual.
- "Tu módulo de esta semana": el módulo con course_week = semana actual.
  Card destacada con título, bloque al que pertenece, progreso de sus 5
  secciones, botón "Continuar". Fecha de cierre de la tarea.
- "Tu progreso": barra global (módulos completados / 72) + rangos
  obtenidos (badges) + bloque actual.
- "Módulos anteriores": accesibles para repaso (semanas < actual).
- "Próximos": bloqueados, con la fecha en que se abren.
- Próximas sesiones en vivo (placeholder si Fase 7 no está).

==== PLAYER /app/(student)/bloques/[blockSlug]/modulos/[moduleSlug] ====
- Gate server: has_access_to_module (course_week <= semana actual). Si no,
  redirige a dashboard con toast.
- 5 secciones (intro/teaching/activation/evaluation/impartation) con
  stepper.
- teaching: player Mux. activation: ver Fase 5 (tarea). evaluation: ver
  Fase 4 (quiz). impartation: frase destacada.
- Marca section_progress al avanzar. module_progress.completed cuando las
  5 estén completas.
- Visual: módulo actual = "abierto"; módulos pasados = "repaso" (se ven
  pero su tarea ya cerró); futuros = bloqueados.

==== APERTURA/CIERRE DE TAREA (calendario) ====
- Al entrar a la sección activation del módulo de la semana, si no existe
  assignment_submission para (user, section) → crearla con status='open',
  opens_at = martes 00:01 de su semana, closes_at = lunes 23:59.
  (Calcula con program_start_date + course_week en la timezone definida.)
- Cron "/api/cron/close-week" cada hora (Bearer CRON_SECRET): SELECT
  assignment_submissions WHERE closes_at < now() AND status='open' →
  si sin contenido 'not_submitted', si con contenido sin enviar 'incomplete'.
- Cron "/api/cron/week-open-notify" diario 06:00: a cada alumno cuyo hoy
  sea el martes de una nueva semana → email "Tu módulo de esta semana ya
  está disponible".

REGLAS: timezone consistente. TS estricto. Idempotencia en crons.

CUANDO TERMINES: crea un alumno aprobado con program_start_date hace 8
días (semana 2). Verifica: semana 1 = repaso, semana 2 = abierta, semana 3
= bloqueada. Simula cierre y verifica marcado incompleto.
```

**Checklist:** dashboard muestra módulo de la semana, player respeta
calendario, tareas abren/cierran, crons funcionan.

---

# FASE 4 — Evaluaciones autocorregibles + reveal 48h

**Objetivo:** quizzes de la sección de evaluación, autocorregibles, con
resultado revelado 48h después.

```
Lee CLAUDE.md v3.3 ("Corrección de tareas y quizzes") y schema (quizzes,
quiz_questions, quiz_attempts con reveal_at).

Tarea: editor admin de quizzes + quiz del alumno + reveal 48h.

ANTES DE CÓDIGO: plan. Espera OK.

PARTE 1 — Admin editor de quiz (en la sección evaluation del módulo):
- 1 quiz por sección de evaluación (1:1). Form: title, description,
  pass_threshold (default 70), max_attempts (nullable), shuffle.
- CRUD de preguntas: prompt, kind (multiple_choice/true_false), payload
  JSONB (opciones + correct_index, o correct bool), explanation, order.

PARTE 2 — Quiz del alumno:
- Render preguntas (shuffle si aplica). Submit → POST
  /api/quizzes/[id]/submit: calcula score, passed; crea quiz_attempt con
  reveal_at = now() + 48h.
- Inmediatamente muestra: "Recibido. Tu resultado estará disponible el
  {reveal_at}." NO muestra score aún.
- Después de reveal_at: muestra score + cada pregunta con correcta/
  incorrecta + explicación.
- Si passed (tras reveal): cuenta para aprobar el módulo.
- Reintentos: respeta max_attempts.

REGLAS: validación server (no permitir submit si no llegó a la sección).
TS estricto.

CUANDO TERMINES: crea un quiz de 5 preguntas, hazlo como alumno, verifica
que el resultado no se ve hasta +48h (ajusta reveal_at en SQL para probar).
```

**Checklist:** alumno hace quiz, resultado oculto 48h, luego visible con
explicaciones.

---

# FASE 5 — Excorrector (tareas escritas IA) + cron 48h 🔑

**Objetivo:** las tareas de la sección Activación se corrigen con un
agente IA en la voz del Dr. Max, resultado 48h después.

```
Lee CLAUDE.md v3.3 ("Corrección de tareas") y schema (assignment_submissions
con ai_feedback, ai_score, results_sent_at).

Tarea: entrega de tarea + agente "excorrector" + cron 48h.

🔑 NECESITO MATERIAL DE VOZ. Antes de construir el excorrector, PÍDELE a
Max material para calibrar su voz (sermones transcritos, escritos,
mensajes largos). Si no los tiene a mano, arranca con un voice manual
pastoral-apostólico genérico y dile que lo refinamos con las primeras
correcciones. Guarda el voice manual en /lib/excorrector/voice-manual.ts.

ANTES DE CÓDIGO: pídele el material de voz, muéstrame el plan. Espera OK.

PARTE 1 — Entrega del alumno (sección activation del player):
- Textarea + (opcional) upload de archivo → "Entregar".
- Al entregar: assignment_submission status='submitted', submitted_at=now().
- Mensaje: "Recibida. Tu corrección llegará en 48 horas."

PARTE 2 — Agente excorrector (/lib/excorrector/index.ts):
- correctAssignment({ submissionId }):
  1. Carga submission + módulo + consigna de la activación.
  2. System prompt: voice manual de Max + consigna + rúbrica.
  3. Claude API (claude-sonnet-4-6 o más reciente — pide permiso para
     @anthropic-ai/sdk).
  4. Devuelve feedback (voz de Max) + score 0-100 + passed bool.
  5. UPDATE assignment_submissions (ai_feedback, ai_score, ai_passed,
     corrected_at).
- El feedback: cálido y pastoral, específico (qué hizo bien / qué mejorar
  / próximo paso), doctrinalmente cuidadoso, cierra con frase de
  impartición.

PARTE 3 — Cron 48h ("/api/cron/grade-assignments" cada hora, Bearer):
- SELECT assignment_submissions WHERE status='submitted' AND submitted_at
  <= now()-interval '48 hours' AND results_sent_at IS NULL.
- Para cada una: status='correcting' → correctAssignment() → status
  'completed'/'incomplete' según ai_passed → email con feedback → set
  results_sent_at=now(). Batch máx 20 por corrida.

PARTE 4 — Vista del resultado:
- Cuando results_sent_at existe: card destacada con el feedback de Max +
  score, en la sección de activación.

REGLAS: ANTHROPIC_API_KEY solo server-side. TS estricto.

CUANDO TERMINES: entrega una tarea, ajusta submitted_at a hace 49h, corre
el cron. Muéstrame el feedback generado para evaluar el tono.
```

**Checklist:** alumno entrega tarea, excorrector corrige en voz de Max
48h después, email llega, feedback se ve en el módulo.

---

# FASE 6 — Certificados + Rangos al completar bloque

**Objetivo:** al aprobar los 8 módulos de un bloque, se otorga el rango y
se emite certificado PDF.

```
Lee CLAUDE.md v3.3 (sistema de rangos) y la función is_block_completed.

Tarea: otorgar rango + certificado al completar un bloque.

ANTES DE CÓDIGO: plan. Espera OK.

LÓGICA (se dispara cuando se aprueba un módulo — en el handler del quiz
o del excorrector):
- Verificar is_block_completed(user, block) del bloque del módulo recién
  aprobado.
- Si true y no existe student_rank para ese rango:
  1. INSERT student_ranks (rank del bloque). UPDATE profiles.current_rank_id.
  2. Generar verification_code único (8 chars). INSERT certificates.
  3. Generar PDF del certificado (@react-pdf/renderer): diseño ceremonial
     con logos, "Certifica que {nombre} completó el Bloque {N}: {título} y
     alcanzó el rango de {rango}", verification_code, fecha, firma Dr. Max.
     Subir a bucket 'certificates'.
  4. Email al alumno: "¡Felicidades! Alcanzaste el rango de {rango}." +
     certificado adjunto.

PÁGINA PÚBLICA /app/(public)/verificar/[code]/page.tsx:
- Busca certificate por verification_code. Si existe: "Certificado
  verificado ✓ — {nombre}, Bloque {N}, rango {rango}, {fecha}." + link a
  PDF (signed URL). Si no: "No encontrado".

CUANDO TERMINES: simula aprobar los 8 módulos de un bloque (marca en SQL),
verifica que se otorga el rango + certificado + email + verificación
pública funciona.
```

**Checklist:** completar 8 módulos → rango otorgado + certificado PDF +
verificación pública.

---

# FASE 7 — Sesiones en vivo (MasterClass por evento)

**Objetivo:** programar MasterClass y mentorías por evento (no recurrentes),
notificar y exponer grabaciones.

```
Lee CLAUDE.md v3.3 ("Sesiones en vivo por evento") y schema (live_sessions
kind masterclass/mentorship/special).

Tarea: admin programa sesiones + vista alumno + notificación + recordatorio.

ANTES DE CÓDIGO: plan. Espera OK.

PARTE 1 — Admin /app/(admin)/en-vivo:
- CRUD live_sessions: kind, title, description, scheduled_at (datetime),
  duration_minutes, meeting_url (Zoom/Meet), host_name, block_id opcional.
- Después: añadir recording_url o recording_mux_playback_id.

PARTE 2 — Alumno /app/(student)/en-vivo:
- Solo con suscripción activa.
- Tabs "Próximas" / "Grabaciones".
- Próximas: cards con kind (badge), título, fecha en TZ del alumno, host,
  botón "Unirme" (abre meeting_url). Si scheduled_at < ahora+15min: "En
  vivo ahora".
- Grabaciones: player Mux o link.

PARTE 3 — Notificación + recordatorio:
- Al crear una sesión: email/banner a todos los suscriptores activos
  ("Nueva MasterClass: {título} el {fecha}").
- Cron "/api/cron/live-reminders" cada 15 min: sesiones con scheduled_at
  entre now()+45min y now()+75min y reminder_sent=false → email
  recordatorio + set reminder_sent=true.

CUANDO TERMINES: crea una sesión para mañana, verifica que aparece en
"Próximas" y que el aviso de creación llegó.
```

**Checklist:** admin crea MasterClass, alumnos la ven, recordatorio 1h
antes funciona.

---

# FASE 8 — Comunidad / Foro

**Objetivo:** suscriptores activos conversan en hilos.

```
Lee CLAUDE.md v3.3 y schema (forum_threads, forum_posts).

Tarea: foro para suscriptores activos.

ANTES DE CÓDIGO: plan. Espera OK.

- /comunidad: hilos ordenados por actividad (autor, título, snippet,
  #respuestas, última actividad). Filtro por bloque.
- /comunidad/nuevo: crear hilo (title, body markdown, block_id opcional).
- /comunidad/[id]: hilo + respuestas (markdown) + form responder. Autor/
  admin: editar/cerrar.
- Admin /admin/comunidad: pinear, cerrar, moderar posts reportados (tabla
  forum_reports — créala en migration 0003 si la necesitas).
- RLS ya exige has_active_subscription para leer/escribir.

CUANDO TERMINES: crea un hilo y responde con tu cuenta admin. Verifica que
un no-suscriptor no puede leer.
```

**Checklist:** suscriptores crean/responden hilos, admin modera, no-subs
bloqueados.

---

# FASE 9 — Tutor IA (RAG) 🔑

**Objetivo:** chatbot entrenado con material del DAP que responde 24/7 con
citas.

**Pre-requisitos:** habilitar extensión `vector` en Supabase. API key
Anthropic.

```
Lee CLAUDE.md v3.3.

Tarea: tutor IA con RAG (ingesta de documentos + chat).

🔑 NECESITO MATERIAL. Pídele a Max PDFs/transcripciones del DAP para
ingestar.

ANTES DE CÓDIGO: pídeme el material, plan. Espera OK.

PARTE 1 — Migration 0003_ai_documents.sql:
- create extension vector;
- tabla ai_documents (source_title, chunk_text, chunk_index,
  embedding vector(1024), metadata) + ivfflat index.
- tabla ai_document_sources.
- RLS admin only.

PARTE 2 — Admin /admin/tutor/documentos:
- Subir PDF → extraer texto (pdf-parse, pide permiso) → chunk ~500 tokens
  overlap 50 → embeddings (Voyage voyage-3-large o OpenAI) → INSERT
  ai_documents.

PARTE 3 — Chat /tutor (solo suscriptores activos):
- UI chat. Al enviar: embedding del mensaje → top 8 chunks similares
  (pgvector cosine) → Claude API (claude-sonnet-4-6) con system prompt
  ("tutor del DAP, doctrina de Max, solo responde con base en los
  documentos, no inventa citas"), contexto = chunks, historial.
- Stream respuesta. Guarda en ai_messages con citations. Muestra fuentes.
- Rate limit: 30 mensajes/día por usuario.

REGLAS: claves solo server-side. TS estricto.

CUANDO TERMINES: ingesta un PDF de prueba, pregúntale algo cubierto,
verifica que cita la fuente y que dice "no encontré" cuando no está.
```

**Checklist:** admin ingesta PDFs, alumno chatea con citas, no inventa.

---

# FASE 10 — Landing copy + pulido visual

**Objetivo:** actualizar todo el texto público al modelo v3.3 y aplicar el
design system.

```
Lee CLAUDE.md v3.3 y DESIGN-SYSTEM.md.

Tarea: actualizar copy del sitio público al modelo v3.3 + pulir visual.

CAMBIOS DE COPY (buscar y reemplazar en landing, /precios, /como-funciona,
/rangos, FAQ, /terminos, /reembolso):
- "200 módulos" → "72 módulos".
- "18 meses, 4 módulos/mes" → "72 semanas, 1 módulo por semana".
- Quitar toda mención de "pausa de cobro" / "gating".
- "MasterClass los miércoles / Activación los viernes" → "MasterClass por
  evento (mínimo 1 al mes) + mentoría grupal".
- Añadir: proceso de admisión (formulario + carta de consentimiento si no
  perteneces a la Red).
- Añadir: corrección personalizada de tareas con feedback del Dr. Max
  (48h) — diferenciador clave.
- Precio: $25 USD/mes, cancela cuando quieras.

CAMBIOS VISUALES:
- Aplicar tokens del DESIGN-SYSTEM (Space Grotesk + Inter, paleta
  navy/violeta/coral, glass). Si los componentes ui-dap aún no existen,
  créalos primero (Button, Card.Glass, Stat, etc. — ver DESIGN-SYSTEM §2).

ANTES DE CÓDIGO: muéstrame el inventario de páginas con copy viejo y el
plan. Espera OK.

CUANDO TERMINES: URL preview. Confirma que no queda ninguna mención a "200
módulos", "pausa", ni "miércoles/viernes".
```

**Checklist:** todo el copy público dice 72 módulos / semanal / sin pausa /
MasterClass por evento; visual con design system.

---

# Orden alternativo si quieres priorizar distinto

- **Camino "alumno primero":** 0 → 1 → 3 → 4 → 5 → 6 (todo lo que vive el
  alumno) y dejar 2, 7, 8, 9 después.
- **Camino "lanzar rápido":** 0 → 10 (landing correcta) → 1 → 2 (admisión
  completa) → 3 (calendario) y abrir inscripciones con eso; 4–9 en marcha.
- **Recomendado (este documento):** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
  → 10. Construye el journey en orden lógico y deja el pulido público al
  final.

# Notas transversales

- **Timezone:** define UNA timezone para todo el cálculo de semanas/tareas
  (martes-lunes). Sugerido: America/Mexico_City. Decídelo en Fase 3.
- **Buckets de Storage necesarios:** consent-letters, admission-letters,
  certificates, blocks-covers, (ai si aplica). Créalos en el dashboard a
  medida que cada fase los pida.
- **Crons totales al final:** admission-letters (24h), close-week,
  week-open-notify, grade-assignments (48h), live-reminders. Todos en
  vercel.json con Bearer CRON_SECRET.
- **Assets que Max debe tener listos:** firma PNG, logo Red Apostólica,
  logo DAP (Fase 2); material de voz (Fase 5); PDFs de doctrina (Fase 9).
