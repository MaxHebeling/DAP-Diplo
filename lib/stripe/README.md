# lib/stripe/

Helpers Stripe.

Archivos planeados (Fase 1):
- `server.ts` — instancia `Stripe` server-side con `STRIPE_SECRET_KEY`.
- `webhook.ts` — verificación de firma + parser de eventos.
- `checkout.ts` — helpers para crear sesiones de checkout.

Modo `test` durante dev. El webhook secret cambia entre `test` y `live`.
