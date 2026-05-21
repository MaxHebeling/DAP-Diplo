import { test, expect } from "@playwright/test";

/**
 * /signup tiene dos estados:
 *   - Inscripciones cerradas (default antes del 01 Jun 2026): card con
 *     "Inscripciones abren el..." y link a /
 *   - Inscripciones abiertas: form de registro con email, password,
 *     fullName + Google OAuth.
 *
 * Como el flag isEnrollmentOpen() depende de fecha y prod puede estar
 * en cualquiera de los dos estados, los tests aceptan ambos.
 */

test.describe("Signup", () => {
  test("renderea (form abierto o card cerrada)", async ({ page }) => {
    await page.goto("/signup");

    const body = page.locator("body");
    // Una de las dos: form abierto (input email) o cerrada (mensaje).
    const formOrClosed = await Promise.race([
      page
        .locator('input[type="email"]')
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => "form"),
      page
        .getByText(/Inscripciones abren/i)
        .waitFor({ state: "visible", timeout: 10_000 })
        .then(() => "closed"),
    ]).catch(() => null);

    expect(formOrClosed).not.toBeNull();

    if (formOrClosed === "form") {
      // Si está abierto, validar la estructura del form.
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(
        page.getByRole("button", { name: /crear|registr|cuenta/i }).first(),
      ).toBeVisible();
    } else {
      // Si está cerrado, debe haber link de vuelta al inicio.
      await expect(body).toContainText(/Volver al inicio/i);
    }
  });
});
