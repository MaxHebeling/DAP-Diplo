// Next.js file convention para instrumentar runtimes. Sentry usa esto
// para registrarse en Node vs Edge runtimes (los configs vienen de
// sentry.server.config.ts y sentry.edge.config.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
