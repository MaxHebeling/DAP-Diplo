import { createClient } from "@/lib/supabase/server";

export type ChurchOption = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
};

/**
 * Devuelve el catálogo de iglesias activas para el combobox del form de
 * admisión. Ordenado por país → nombre. Usa el cliente SSR normal (la
 * policy `churches read authenticated` deja a cualquier authenticated
 * leer el catálogo).
 */
export async function listActiveChurches(): Promise<ChurchOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("churches")
    .select("id, name, country, city")
    .eq("status", "active")
    .order("country", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) {
    console.error("[listActiveChurches]", error.message);
    return [];
  }
  return (data ?? []) as ChurchOption[];
}
