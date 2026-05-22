// Sentry — browser-side config. Captura errores de cliente (React,
// fetch, browser APIs) y mide performance del frontend.
import * as Sentry from "@sentry/nextjs";

import { dapBeforeSend } from "@/lib/sentry/scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Sample rate de spans para performance traces. 0.1 = 10% de requests.
  // En launch lo dejamos generoso para tener visibilidad; bajar después.
  tracesSampleRate: 0.2,

  // Session Replay — graba sesiones donde hubo error (no todo el tráfico).
  // 0% baseline + 100% en errors mantiene bajo el uso del quota.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // En dev no enviar a Sentry (sólo log a consola).
  enabled: process.env.NODE_ENV === "production",

  // Scrubbing de PII (email, full_name, dirección) antes de enviar.
  beforeSend: dapBeforeSend,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

// Capture navigation transitions para tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
