import { test, expect } from "@playwright/test";

/**
 * Smoke tests de páginas públicas — rendean sin error, tienen el
 * contenido principal esperado, y SEO básico está bien.
 *
 * Estos tests corren contra prod por default y son no destructivos
 * (puro GET + assertions de DOM).
 */

test.describe("Páginas públicas", () => {
  test("home renderea correctamente", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DAP|Diplomado/i);
    // El hero contiene el nombre de la marca.
    await expect(page.locator("body")).toContainText(/DAP|Diplomado/i);
  });

  test("/como-funciona explica el modelo", async ({ page }) => {
    await page.goto("/como-funciona");
    await expect(page).toHaveTitle(/Cómo funciona/i);
    // Debe mencionar el flujo de admisión y suscripción.
    const body = page.locator("body");
    await expect(body).toContainText(/admisión|admisi[óo]n/i);
    await expect(body).toContainText(/\$25/);
  });

  test("/rangos lista las 9 dimensiones", async ({ page }) => {
    await page.goto("/rangos");
    await expect(page.locator("body")).toContainText(/Discípulo|discipulo/i);
    await expect(page.locator("body")).toContainText(/Enviado/i);
  });

  test("/verificar/INVALID muestra estado de no encontrado sin filtrar errores", async ({
    page,
  }) => {
    await page.goto("/verificar/INVALID01");
    await expect(page.locator("body")).toContainText(
      /no encontrado|verificación fallida/i,
    );
    // No debe exponer detalles internos de la RPC al usuario.
    await expect(page.locator("body")).not.toContainText(/postgres|PGRST/i);
    await expect(page.locator("body")).not.toContainText(/verify_certificate/);
  });

  test("/login renderea form sin secrets en HTML", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    const html = await page.content();
    // Sanity check: no Service Role Key filtrado en bundle.
    expect(html).not.toMatch(/service_role/i);
  });
});
