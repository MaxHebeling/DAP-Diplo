/**
 * Formato monetario coherente entre AR y MX (y cualquier otra moneda futura).
 *
 * Ejemplos:
 *   formatMoney(30000, "ARS") → "$30.000 ARS"
 *   formatMoney(450, "MXN")   → "$450 MXN"
 *   formatMoney(1350, "MXN")  → "$1,350 MXN"
 *
 * El locale se deriva de la moneda para que los separadores de miles
 * matcheen la convención regional (AR usa puntos, MX usa comas).
 */
export function formatMoney(amount: number, currency: string): string {
  const locale = localeFor(currency);
  return `$${amount.toLocaleString(locale)} ${currency}`;
}

/**
 * Igual que formatMoney pero sin el sufijo de moneda — útil cuando la
 * moneda ya se comunica visualmente en otra parte del UI.
 */
export function formatMoneyBare(amount: number, currency: string): string {
  return `$${amount.toLocaleString(localeFor(currency))}`;
}

function localeFor(currency: string): string {
  switch (currency.toUpperCase()) {
    case "ARS":
      return "es-AR";
    case "MXN":
      return "es-MX";
    case "USD":
      return "en-US";
    default:
      return "es";
  }
}
