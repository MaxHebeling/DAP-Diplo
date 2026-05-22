import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    // Tree-shake mejor estas libs grandes con muchos imports nombrados.
    optimizePackageImports: ["lucide-react", "motion", "@mux/mux-player-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "udrzhoswelxrosznxawe.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry wrapper para upload de source maps en build (stack traces
// legibles) + tunnel para bypassear ad-blockers en cliente.
// Si las env vars SENTRY_ORG/PROJECT no están seteadas (dev local sin
// auth token), el wrapper no rompe — solo skipea el upload.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silencia logs de Sentry CLI durante build excepto cuando hay error.
  silent: !process.env.CI,

  // /monitoring → endpoint del cliente que evade ad-blockers que
  // bloquean dominios *.sentry.io en el navegador.
  tunnelRoute: "/monitoring",

  // Source maps: subimos a Sentry pero no los servimos al cliente.
  sourcemaps: { disable: false },

  disableLogger: true,
});
