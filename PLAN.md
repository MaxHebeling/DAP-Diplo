# Plan de implementación — DAP

Plan de seis fases para construir DAP de cero hasta producción. Cada fase tiene un objetivo concreto, los prompts exactos que usarás con Claude Code y un criterio de "fase terminada" para no avanzar antes de tiempo.

**Regla de oro:** no saltarse fases. Una fase incompleta arrastrada a la siguiente es la causa #1 de proyectos que mueren en la fase 3.

---

## Resumen de fases

| Fase | Objetivo | Tiempo estimado | Costo mensual al terminar |
|------|----------|-----------------|---------------------------|
| 0 | Setup base | 1 día | $0 |
| 1 | MVP core (auth, módulos, video, pago) | 1–2 semanas | $0–30 |
| 2 | Exámenes y certificados | 4–6 días | $0–30 |
| 3 | Comunidad / foro | 3–5 días | $0–30 |
| 4 | Sesiones en vivo | 2–3 días | $0–30 |
| 5 | Tutor IA con RAG | 1 semana | $30–80 |

> Total estimado: 4–7 semanas trabajando part-time. 2–3 semanas full-time.

---

## Fase 0 — Setup base

**Objetivo:** repo en GitHub, proyecto Next.js corriendo localmente, Supabase conectado, primer deploy a Vercel.

### Pasos manuales (los haces tú, no Claude Code)

1. Crear cuenta gratuita en **Supabase**, **Vercel**, **Stripe (modo test)**, **Mux** y **Resend**.
2. Crear repo `DAP-Diplo` en GitHub (privado).
3. Crear proyecto Supabase llamado `dap-prod` (free tier).
4. Crear proyecto Vercel conectado al repo.

### Prompts para Claude Code

> Abre VS Code en una carpeta vacía, lanza Claude Code, y empieza con estos prompts en orden.

**Prompt 0.1**
```
Lee el archivo CLAUDE.md que voy a pegar aquí y úsalo como referencia
permanente para este proyecto. Confírmame que entiendes el stack y las
convenciones antes de empezar.
```
*(pegas el contenido de CLAUDE.md)*

**Prompt 0.2**
```
Inicializa un proyecto Next.js 15 con TypeScript, Tailwind, App Router y
ESLint en este directorio. Usa pnpm. No instales nada extra todavía.
Cuando termines, muéstrame los comandos exactos que ejecutaste.
```

**Prompt 0.3**
```
Configura shadcn/ui con el theme "neutral". Añade estos componentes
iniciales: button, card, input, label, dialog, dropdown-menu, toast,
form, separator, badge, avatar. Verifica que el dev server corre sin
errores.
```

**Prompt 0.4**
```
Crea la estructura de carpetas exacta descrita en CLAUDE.md sección 4
(/app con (public), (student), (admin); /components con ui y feature;
/lib con supabase, stripe, mux, utils; /types; /supabase/migrations).
Añade un README breve en cada carpeta explicando qué va dentro.
```

**Prompt 0.5**
```
Instala @supabase/ssr y @supabase/supabase-js. Crea los clientes
Supabase en /lib/supabase: uno para Server Components, uno para
Route Handlers/middleware, uno para Client Components. Usa el patrón
oficial de @supabase/ssr para Next 15 App Router. Crea también el
middleware.ts que refresca la sesión en cada request.
```

**Prompt 0.6**
```
Crea un archivo .env.example en la raíz con TODAS las variables del
CLAUDE.md sección 7, comentadas. Crea .env.local con las variables
reales (te las paso por separado). Asegúrate que .env.local esté en
.gitignore.
```

**Prompt 0.7** (este lo corres tú en Supabase SQL editor, no Claude Code)
```
Aplicar la migration /supabase/migrations/0001_initial_schema.sql en
Supabase. Verificar que las 15 tablas están creadas y que RLS está
habilitado en todas.
```

**Prompt 0.8**
```
Crea una página simple en /app/page.tsx que diga "DAP - Diplomado
Apostólico para Pastores" con un botón "Ver módulos" que linkea a
/modulos (todavía no existe, pondremos un placeholder). Confirma que
todo compila y corre en localhost:3000.
```

**Prompt 0.9**
```
Inicializa git, haz el primer commit con mensaje "chore: initial
scaffolding", crea el remote origin apuntando al repo DAP-Diplo, y haz
push a main. Después conecta Vercel y verifica que el primer deploy
funciona en la URL temporal de Vercel.
```

### Fase 0 terminada cuando:
- [ ] `localhost:3000` muestra la landing básica.
- [ ] La URL de Vercel muestra lo mismo.
- [ ] Las 15 tablas existen en Supabase con RLS activo.
- [ ] `.env.local` no está commiteado (verificarlo con `git status`).
- [ ] Primer commit en GitHub.

---

## Fase 1 — MVP core

**Objetivo:** un alumno puede registrarse, ver la lista de módulos, comprar uno con Stripe, ver el video de las lecciones y marcar su progreso. Esto es lo mínimo para empezar a vender.

### Pasos manuales

1. Crear un módulo de prueba en Supabase manualmente con 2–3 lecciones (puedes hacerlo desde el SQL editor o desde el admin que construirás luego).
2. Subir 1–2 videos a Mux para tener `mux_playback_id` reales.
3. Crear en Stripe (modo test) un Product + Price para ese módulo. Anotar el `price_id`.

### Prompts para Claude Code

**Prompt 1.1 — Auth**
```
Implementa páginas de signup, login y logout. Usa Supabase Auth con
email/password. La página /signup debe pedir: email, password, nombre
completo, nombre del ministerio (opcional), país. Tras signup exitoso
crea el profile en /public/profiles via trigger (ya existe). Después
redirige a /modulos.

Implementa también el middleware de Next que redirige a /login si una
ruta protegida ((student) o (admin)) se accede sin sesión.

UI en español, usando los componentes shadcn que ya tenemos.
```

**Prompt 1.2 — Listado de módulos**
```
Implementa /app/(public)/modulos/page.tsx como un Server Component que
muestra todos los módulos donde published = true, ordenados por
order_index. Cada módulo se muestra como un Card con:
- imagen de portada
- título
- subtítulo
- duración aproximada (suma de duration_seconds de sus lecciones)
- precio formateado
- botón "Ver detalle" que lleva a /modulos/[slug]

Lee directamente de Supabase usando el cliente server. Maneja el caso
de "no hay módulos todavía" con un empty state.
```

**Prompt 1.3 — Detalle de módulo**
```
Implementa /app/(public)/modulos/[slug]/page.tsx con:
- Hero con imagen, título, subtítulo, descripción
- Lista de lecciones (solo título y duración; el video solo se ve si está inscrito)
- Si la lección tiene is_free_preview, mostrar un botón "Ver vista previa"
- Si el usuario está logueado Y inscrito (consultar enrollments): botón "Continuar curso"
- Si no está inscrito: botón "Comprar - $XX" que dispara checkout

Lectura desde Supabase server-side. SSR.
```

**Prompt 1.4 — Stripe checkout**
```
Implementa el flujo de compra de un módulo con Stripe Checkout hosted:

1. POST /api/checkout/create-session: recibe { moduleId }, valida que
   el usuario esté logueado, crea una Stripe Checkout Session con el
   stripe_price_id del módulo, metadata { userId, moduleId }, success_url
   /modulos/[slug]/exito y cancel_url /modulos/[slug].

2. POST /api/webhooks/stripe: maneja el evento checkout.session.completed.
   Verifica firma del webhook. Inserta una fila en enrollments con
   amount_paid_cents, stripe_session_id, status='active'. Idempotente
   (si el evento se repite, no duplica).

3. Configura el endpoint del webhook en Stripe dashboard.

Usa el SDK oficial de Stripe. Maneja errores y devuelve códigos HTTP
apropiados al webhook.
```

**Prompt 1.5 — Reproductor de lecciones**
```
Implementa /app/(student)/modulos/[slug]/lecciones/[lessonSlug]/page.tsx
con:
- Sidebar izquierda: lista de todas las lecciones del módulo con check
  ✓ en las completadas (consultar lesson_progress).
- Centro: reproductor de video Mux usando @mux/mux-player-react.
- Debajo del video: título, descripción, recursos descargables (lesson_resources).
- Botón "Marcar como completada" que crea/actualiza la fila de lesson_progress.
- Botón "Siguiente lección" cuando esté completa.

El reproductor debe escuchar el evento timeupdate y guardar
last_position_seconds cada 10 segundos para que el alumno pueda
"retomar donde quedó".

Server Component para la página, Client Component solo para el reproductor.
Verifica acceso (RLS lo hace, pero también gate en server: si no está
inscrito y la lección no es free preview, redirige a /modulos/[slug]).
```

**Prompt 1.6 — Dashboard del alumno**
```
Implementa /app/(student)/dashboard/page.tsx que muestra:
- Saludo "Hola, {nombre}"
- Módulos inscritos como cards con barra de progreso (% de lecciones completadas)
- Botón "Continuar" que lleva a la última lección vista
- Sección "Explorar más módulos" con módulos NO inscritos
```

**Prompt 1.7 — Admin básico**
```
Implementa /app/(admin) con autenticación que requiere profile.role = 'admin'.
Pantallas:
- /admin/modulos: tabla de módulos con CRUD básico
- /admin/modulos/[id]/lecciones: tabla de lecciones del módulo
- Formularios con react-hook-form + zod
- Upload de imagen de portada a Supabase Storage
- Para mux_playback_id: lo pegas manual por ahora (la carga en Mux la
  haces fuera del admin en Fase 1, automatizamos después).

No te preocupes por un UI bonito todavía. Funcional > bello.
```

**Prompt 1.8 — Emails básicos con Resend**
```
Cuando se crea un enrollment exitoso (en el webhook de Stripe), envía
un email al alumno con Resend confirmando la compra y un link al
módulo. Usa una plantilla simple con react-email o HTML inline.
```

### Fase 1 terminada cuando:
- [ ] Un alumno de prueba puede registrarse, comprar un módulo con tarjeta de prueba de Stripe, ver los videos, y marcar su progreso.
- [ ] Tú puedes entrar como admin y crear módulos/lecciones.
- [ ] El webhook de Stripe funciona en producción (probarlo en Vercel preview).
- [ ] El alumno recibe email de confirmación.

> **Punto crítico:** llegando aquí, ya tienes un producto vendible. Considera lanzar con un módulo de prueba antes de seguir.

---

## Fase 2 — Exámenes y certificados

### Prompts

**Prompt 2.1 — Quiz por lección**
```
Implementa el flujo de quiz por lección:
- En el admin (/admin/modulos/[id]/lecciones/[lid]/quiz): CRUD del quiz
  y sus preguntas (multiple choice o V/F). Editor simple.
- En el alumno: si la lección tiene quiz, después del video aparece
  un botón "Hacer cuestionario" que muestra las preguntas en una
  página dedicada. Al enviar, calcula score, crea quiz_attempts,
  muestra resultados con explicación de cada pregunta.
- La lección no se marca como completada hasta aprobar el quiz
  (si pass_threshold se cumple).
```

**Prompt 2.2 — Examen final del módulo**
```
Igual que el quiz por lección, pero a nivel módulo. Se desbloquea
solo cuando todas las lecciones están completas. Pass threshold por
defecto 70%. Si no aprueba, puede reintentar (respetando max_attempts
si está definido).
```

**Prompt 2.3 — Certificado en PDF**
```
Cuando un alumno aprueba el examen final de un módulo:
1. Genera un PDF usando @react-pdf/renderer en una Route Handler.
2. Diseño: fondo elegante, "DAP - Diplomado Apostólico para Pastores",
   "Certifica que [nombre] ha completado [módulo]", fecha,
   código de verificación (8 chars alfanuméricos), firma visual.
3. Sube el PDF a Supabase Storage (bucket 'certificates', privado).
4. Inserta fila en certificates con verification_code y pdf_url.
5. Email al alumno con link de descarga (signed URL de 24h).

Crea también /verificar/[code] como página pública que muestra
"Sí, el certificado [code] fue emitido a [nombre] el [fecha] por el
módulo [módulo]".
```

### Fase 2 terminada cuando:
- [ ] Un alumno puede aprobar quizzes y examen final.
- [ ] Recibe certificado PDF por email.
- [ ] El código del certificado se verifica públicamente.

---

## Fase 3 — Comunidad / foro

### Prompts

**Prompt 3.1**
```
Implementa /comunidad como una sección para alumnos con al menos 1
enrollment activo (la policy de RLS ya lo hace cumplir):

- /comunidad: lista de hilos recientes con autor, título, snippet,
  conteo de respuestas, última actividad.
- /comunidad/nuevo: crear hilo (título + body en markdown simple).
- /comunidad/[id]: ver hilo completo con todas las respuestas en
  estructura plana (sin anidamiento por ahora, parent_post_id sí en
  la tabla por si después).
- Responder al hilo desde la misma página.
- Editor markdown simple (textarea con preview, no necesita ser fancy).
- Avatares de los autores.

Realtime opcional: usar supabase.channel para notificar cuando hay
respuesta nueva.
```

**Prompt 3.2 — Moderación básica**
```
Para el admin: panel /admin/comunidad con capacidad de pinear hilos,
cerrar hilos, borrar posts. Notificación al admin por email cuando
alguien reporta un post (botón "Reportar" en cada post).
```

### Fase 3 terminada cuando:
- [ ] Los alumnos inscritos pueden ver el foro, abrir hilos y responder.
- [ ] Los no inscritos no pueden ni leer.
- [ ] El admin puede moderar.

---

## Fase 4 — Sesiones en vivo

### Prompts

**Prompt 4.1**
```
Implementa /en-vivo en el área del alumno:
- Lista de sesiones próximas (scheduled_at > now()) con título,
  descripción, fecha/hora en zona horaria del usuario, host, botón
  "Unirme" que abre meeting_url en nueva pestaña.
- Sesiones pasadas con grabación: muestra link a recording_url.
- Admin (/admin/en-vivo): CRUD básico de live_sessions.

Email automatizado 1 hora antes de cada sesión a todos los inscritos
con al menos 1 módulo (usar Vercel Cron o Supabase Edge Function).
```

### Fase 4 terminada cuando:
- [ ] Un admin puede programar una sesión y los alumnos la ven.
- [ ] El email de recordatorio funciona.

---

## Fase 5 — Tutor IA con RAG

Esta es la fase que diferencia DAP de cualquier SaaS. Requiere paciencia técnica.

### Pasos manuales
1. Habilitar la extensión `vector` en Supabase (dashboard → Database → Extensions).
2. Descomentar la tabla `ai_documents` del schema y aplicarla.
3. Conseguir API key de Anthropic (Claude).

### Prompts

**Prompt 5.1 — Ingesta de documentos**
```
Implementa /admin/tutor/documentos:
- Upload de PDFs (libros, sermones, materiales del DAP).
- Pipeline: extraer texto con pdf-parse, dividir en chunks de ~500
  tokens con overlap de 50, generar embeddings con
  voyage-3 o text-embedding-3-large vía API, insertar en ai_documents
  con metadata { source_title, page }.
- UI muestra documentos ya ingestados y permite borrar uno (con sus chunks).
```

**Prompt 5.2 — Chat con RAG**
```
Implementa /tutor en el área del alumno:
- UI estilo chat (mensajes del usuario a la derecha, del asistente a la izquierda).
- Cuando el alumno envía un mensaje:
  1. Genera embedding del mensaje.
  2. Busca los top 8 chunks más similares en ai_documents
     (cosine similarity con pgvector).
  3. Llama a Claude API con: system prompt explicando que es el tutor
     del DAP basado en la doctrina apostólica del usuario, los chunks
     recuperados como contexto, y la conversación previa.
  4. Stream la respuesta al cliente con server-sent events o el helper
     de Vercel AI SDK.
  5. Guarda user message + assistant message en ai_messages con las
     citations usadas.
- Mostrar al final de cada respuesta las fuentes citadas (linkeadas
  al PDF original si es público).
- Permitir crear nuevas conversaciones, ver historial.

System prompt que enfatice: solo responder con base en los documentos;
si no sabe, decirlo; jamás inventar versículos o doctrina.
```

**Prompt 5.3 — Rate limit y costos**
```
Añade rate limit por usuario: máximo 30 mensajes al tutor por día.
Implementa con upstash redis o tabla en Supabase. Muestra al usuario
cuántos mensajes le quedan.
```

### Fase 5 terminada cuando:
- [ ] El admin puede subir PDFs y se ingestan correctamente.
- [ ] El alumno conversa con el tutor y este responde citando las fuentes correctas.
- [ ] El tutor responde "no encontré información sobre esto" cuando el tema no está en los documentos (en vez de inventar).

---

## Después del MVP completo

Cosas que NO están en este plan y se evalúan después según tracción:

- App móvil (PWA primero, después React Native si vale la pena).
- Pagos en moneda local LATAM (Stripe + Mercado Pago).
- Analítica de aprendizaje (Mixpanel o PostHog).
- A/B testing de copy en landing.
- Afiliados / referidos.
- Suscripción mensual además de pago por módulo.

---

## Errores comunes que vas a cometer (y cómo evitarlos)

| Error | Cómo evitarlo |
|-------|---------------|
| Pedir a Claude Code una feature gigante | Una pantalla / un endpoint / un componente por vez |
| No revisar los diffs antes de hacer commit | Siempre `git diff` antes de `git commit`. Aunque sea aburrido. |
| Olvidar agregar policy de RLS a tabla nueva | Tener checklist: tabla nueva = enable RLS + al menos 1 policy de select |
| Probar solo en local | Probar en Vercel preview en cada PR — los webhooks y URLs públicas se rompen distinto |
| Quemar dinero en Mux subiendo todos los videos antes de validar | Subir 1–2 videos de prueba primero, validar el flujo, después subir todo |
| Hacer el admin muy bonito antes de validar el alumno | El admin lo usas tú. Funcional. El UI del alumno es donde inviertes diseño. |
| Saltar Fase 1 e ir directo a Fase 5 (IA) | El tutor IA sin alumnos pagando = juguete. Termina Fase 1 antes. |
