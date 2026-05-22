// Sentry — Edge runtime config (middleware/proxy + Edge route handlers).
import * as Sentry from "@sentry/nextjs";

import { dapBeforeSend } from "@/lib/sentry/scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.2,

  enabled: process.env.NODE_ENV === "production",

  beforeSend: dapBeforeSend,
});
