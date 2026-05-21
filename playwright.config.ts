import { defineConfig, devices } from "@playwright/test";

/**
 * Suite E2E del DAP. Por default corre contra prod (dapglobal.org) —
 * smoke tests no destructivos.
 *
 * Para correr contra local: `BASE_URL=http://localhost:3000 pnpm test:e2e`.
 * Para correr contra preview de Vercel: `BASE_URL=https://dap-diplo-xxx.vercel.app pnpm test:e2e`.
 */
const BASE_URL = process.env.BASE_URL ?? "https://www.dapglobal.org";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "list",
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
