import { test, expect } from "@playwright/test";

/**
 * Verifica que los security headers que agregamos en `next.config.ts`
 * estén efectivamente sirviéndose en cada response. Si alguien remueve
 * el bloque de headers por error, este test grita.
 */

test.describe("Security headers", () => {
  test("la home responde con HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);

    const h = res.headers();
    expect(h["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(h["strict-transport-security"]).toContain("includeSubDomains");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["permissions-policy"]).toContain("geolocation=()");
  });
});
