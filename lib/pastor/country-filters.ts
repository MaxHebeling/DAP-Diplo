import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helpers para filtrar por país en las vistas admin AR/MX.
 *
 * El país "canónico" de un alumno vive en `churches.country` via
 * `profiles.church_id` — más confiable que `profiles.country` que puede
 * estar vacío/mal escrito por drift de admisión.
 */

/**
 * IDs de alumnos aprobados cuya iglesia primaria pertenece al país dado.
 * Se usa para acotar `monthly_bills.user_id`.
 */
export async function studentIdsInCountry(
  admin: SupabaseClient,
  country: string,
): Promise<string[]> {
  const { data: churchesInCountry } = await admin
    .from("churches")
    .select("id")
    .eq("country", country);
  const churchIds = (churchesInCountry ?? []).map((c) => c.id as string);
  if (churchIds.length === 0) return [];

  const { data: profs } = await admin
    .from("profiles")
    .select("id")
    .in("church_id", churchIds)
    .eq("admission_status", "approved");
  return (profs ?? []).map((p) => p.id as string);
}

/**
 * IDs de pastores activos cuya iglesia primaria pertenece al país dado.
 * Se usa para acotar `pastor_remittances.pastor_user_id`.
 */
export async function pastorIdsInCountry(
  admin: SupabaseClient,
  country: string,
): Promise<string[]> {
  const { data: churchesInCountry } = await admin
    .from("churches")
    .select("id")
    .eq("country", country);
  const churchIds = (churchesInCountry ?? []).map((c) => c.id as string);
  if (churchIds.length === 0) return [];

  const { data: cps } = await admin
    .from("church_pastors")
    .select("pastor_user_id")
    .in("church_id", churchIds)
    .eq("status", "active");
  return Array.from(new Set((cps ?? []).map((c) => c.pastor_user_id as string)));
}
