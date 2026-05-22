// Config dinámico para Lighthouse CI.
// - Default: corre contra prod (www.dapglobal.org).
// - Con LHCI_BASE_URL=<preview-url> definida en el env, corre contra esa
//   URL (usado por el workflow preview-checks.yml al detectar el deploy
//   de Vercel asociado al PR).
//
// Mantener en sync con lighthouserc.json original si se hacen cambios
// (los thresholds están calibrados con runs reales — ver §13.9 CLAUDE.md).

const BASE_URL = (
  process.env.LHCI_BASE_URL ?? "https://www.dapglobal.org"
).replace(/\/$/, "");

module.exports = {
  ci: {
    collect: {
      url: [
        `${BASE_URL}/`,
        `${BASE_URL}/como-funciona`,
        `${BASE_URL}/rangos`,
        `${BASE_URL}/precios`,
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.85 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],

        "largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 500 }],
        "first-contentful-paint": ["error", { maxNumericValue: 2000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
