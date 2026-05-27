import type { Locale } from "@/i18n/config";

/**
 * Devuelve el valor de un campo de contenido en el idioma activo.
 *
 * Estrategia de "columnas traducidas": cada tabla de contenido tiene la
 * columna base en español (p.ej. `name`, `title`, `description`) y una
 * columna paralela con sufijo `_en` (p.ej. `name_en`). Cuando el locale
 * es "en" y la columna `_en` tiene contenido, se usa; si no, cae al
 * español. Así el inglés es progresivo: lo que aún no se tradujo se
 * muestra en español en vez de quedar vacío.
 *
 * @example
 *   const name = localized(rank, "name", locale);          // string
 *   const desc = localized(phase, "description", locale);   // string | null
 */
export function localized<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: Locale,
): string | null {
  if (locale === "en") {
    const en = row[`${field}_en`];
    if (typeof en === "string" && en.trim().length > 0) return en;
  }
  const base = row[field];
  return typeof base === "string" ? base : null;
}

/**
 * Lista de sufijos de columnas traducibles por tabla. Útil para construir
 * los `select(...)` de Supabase sin olvidar columnas `_en`. Mantener en
 * sync con la migración que crea las columnas.
 */
export const TRANSLATABLE_COLUMNS = {
  ranks: ["name", "description"],
  blocks: ["title", "subtitle", "description", "brand_name", "promise"],
  phases: ["title", "subtitle", "description", "brand_name", "promise"],
  modules: [
    "title",
    "subtitle",
    "description",
    "objective",
    "main_revelation",
    "impartation_phrase",
  ],
  module_sections: ["title", "body_md"],
} as const;

/**
 * Devuelve "col, col_en" para cada campo traducible de una tabla, listo
 * para interpolar en un `.select(...)`.
 *
 * @example
 *   .select(`order_index, ${selectWithEn("ranks")}`)
 *   // → "order_index, name, name_en, description, description_en"
 */
export function selectWithEn(
  table: keyof typeof TRANSLATABLE_COLUMNS,
): string {
  return TRANSLATABLE_COLUMNS[table]
    .flatMap((c) => [c, `${c}_en`])
    .join(", ");
}
