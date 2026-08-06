import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Datos bancarios de destino por país del pastor.
 *
 * Cada pastor ve la cuenta correspondiente al país de su iglesia
 * primaria. Sumar otro país = agregar una entrada más.
 */
export type BankField = { label: string; value: string; wide?: boolean };
export type BankAccount = { fields: BankField[] };

export const BANK_ACCOUNTS: Record<string, BankAccount> = {
  Argentina: {
    fields: [
      { label: "Titular", value: "Maximiliano Ariel Hebeling", wide: true },
      { label: "Banco", value: "Brubank" },
      { label: "Alias", value: "maximilianohebeling" },
      { label: "CBU", value: "1430001713028093230012" },
      { label: "N° de cuenta", value: "1302809323001" },
    ],
  },
  México: {
    fields: [
      { label: "Titular", value: "Maximiliano Ariel Hebeling", wide: true },
      { label: "Banco", value: "Mercado Pago" },
      { label: "CLABE", value: "722969015719372828" },
      { label: "N° de tarjeta", value: "5428 7809 4284 1222" },
    ],
  },
};

/**
 * Devuelve el país del pastor derivado de su iglesia primaria + la
 * cuenta bancaria correspondiente. Fallback: Argentina (comportamiento
 * legacy — todos los pastores antes de MX eran AR).
 */
export async function getPastorBankAccount(
  admin: SupabaseClient,
  pastorUserId: string,
): Promise<{ country: string; account: BankAccount }> {
  const { data: cpRow } = await admin
    .from("church_pastors")
    .select("church:churches!inner(country)")
    .eq("pastor_user_id", pastorUserId)
    .eq("is_primary", true)
    .eq("status", "active")
    .maybeSingle<{ church: { country: string } }>();
  const country = cpRow?.church?.country ?? "Argentina";
  const account = BANK_ACCOUNTS[country] ?? BANK_ACCOUNTS.Argentina;
  return { country, account };
}
