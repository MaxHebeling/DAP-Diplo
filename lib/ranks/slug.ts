/**
 * Slug determinístico para los 9 rangos (dimensions.name → URL-safe).
 * Tabla `dimensions` no tiene columna slug, así que lo generamos de
 * la única fuente de verdad: el name normalizado.
 */
export function rankSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Limpia la descripción de la DB ("Otorgado al completar el Bloque 1 — ...")
 * para mostrar solo el tema del bloque.
 */
export function rankThemeFromDescription(description: string | null): string | null {
  if (!description) return null;
  return description.replace(
    /^Otorgado al completar (la|el) (Fase|Bloque) \d+ — /,
    "",
  );
}
