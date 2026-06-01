/**
 * Configuración Mercado Pago AR.
 *
 * - Cobramos en ARS, mensual recurrente vía Preapproval.
 * - Precio actual: 30.000 ARS/mes (≈USD 25 al cambio oficial junio 2026).
 *   Si la inflación lo erosiona, actualizamos acá.
 * - País gating: solo visitantes desde Argentina ven la opción MP. El
 *   resto va a Stripe USD. Decisión: simplifica fiscal/contable y evita
 *   abusos de TC desde otros países.
 */

export const MP_API_BASE = "https://api.mercadopago.com";

// Token de acceso del vendedor. En prod va el APP_USR-…, en dev el TEST-…
export function getMpAccessToken(): string {
  // En prod usamos siempre el de producción (APP_USR-…)
  // En desarrollo local podemos usar el de test si está definido,
  // sino el de producción.
  const prod = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const test = process.env.MERCADOPAGO_ACCESS_TOKEN_TEST;
  const useTest =
    process.env.NODE_ENV === "development" &&
    process.env.MP_USE_TEST_CREDENTIALS === "1" &&
    !!test;
  const token = useTest ? test : prod;
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN no configurado (ni prod ni test).",
    );
  }
  return token;
}

// Precio mensual ARS — en pesos enteros (NO centavos). MP usa "transaction_amount"
// como decimal (e.g. 30000.00). Mantenemos como int para evitar floats.
export const MP_MONTHLY_ARS = 30000;
export const MP_CURRENCY = "ARS" as const;
export const MP_FREQUENCY = 1;
export const MP_FREQUENCY_TYPE = "months" as const;

// Etiqueta humana visible en el resumen de MP del comprador.
export const MP_PLAN_REASON = "Diplomado Apostólico Pastoral — suscripción mensual";

// País gating (en español si por algo lo mostramos en UI).
export const AR_COUNTRY_CODE = "AR";
