# app/api/

Route handlers (Edge / Node, según el caso).

Endpoints planeados:
- `POST /api/checkout/create-session` — crea Stripe Checkout Session para un módulo
- `POST /api/webhooks/stripe` — handler de eventos Stripe (idempotente)
- `POST /api/webhooks/mux` — handler de eventos Mux (asset ready, etc.)
- `POST /api/lessons/[id]/progress` — actualiza `lesson_progress` (alternativa a Server Actions)
- `POST /api/tutor/chat` — stream de respuesta del tutor IA con RAG (Fase 5)
- `POST /api/admin/documents/ingest` — ingesta y vectorización de PDFs (Fase 5)

Verificar firma de webhooks. Para mutaciones internas usar `service_role` con cuidado.
