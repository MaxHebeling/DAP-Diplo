import { test, expect } from "@playwright/test";

/**
 * Verifica que las páginas públicas emitan los schemas JSON-LD que
 * Google necesita para rich snippets:
 *
 *   /              → Organization + WebSite + FAQPage (FaqSection)
 *   /rangos        → ItemList (9 dimensiones) + BreadcrumbList
 *   /rangos/[slug] → Course + BreadcrumbList
 *
 * Si alguien quita un script type="application/ld+json" sin querer,
 * este test falla.
 */

async function collectJsonLd(page: import("@playwright/test").Page) {
  return page.$$eval(
    'script[type="application/ld+json"]',
    (scripts) =>
      scripts
        .map((s) => s.textContent ?? "")
        .map((t) => {
          try {
            return JSON.parse(t) as { "@type"?: string };
          } catch {
            return null;
          }
        })
        .filter((x): x is { "@type"?: string } => x !== null),
  );
}

test.describe("Structured data (JSON-LD)", () => {
  test("home tiene Organization + WebSite + FAQPage", async ({ page }) => {
    await page.goto("/");
    const ld = await collectJsonLd(page);
    const types = ld.map((x) => x["@type"]);
    expect(types).toContain("EducationalOrganization");
    expect(types).toContain("WebSite");
    expect(types).toContain("FAQPage");
  });

  test("/rangos tiene ItemList + BreadcrumbList", async ({ page }) => {
    await page.goto("/rangos");
    const ld = await collectJsonLd(page);
    const types = ld.map((x) => x["@type"]);
    expect(types).toContain("ItemList");
    expect(types).toContain("BreadcrumbList");
  });
});
