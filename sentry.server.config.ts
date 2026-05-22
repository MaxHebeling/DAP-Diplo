// Sentry — server-side config. Captura errores en route handlers, server
// actions, crons, y webhooks (Stripe/Mux).
import * as Sentry from "@sentry/nextjs";

import { dapBeforeSend } from "@/lib/sentry/scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.2,

  enabled: process.env.NODE_ENV === "production",

  beforeSend: dapBeforeSend,
});
