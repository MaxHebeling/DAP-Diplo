import {
  getMpAccessToken,
  MP_API_BASE,
  MP_CURRENCY,
  MP_MONTHLY_ARS,
} from "@/lib/mercadopago/config";

/**
 * Mercado Pago Checkout Pro Preference API — para pagos one-shot
 * que aceptan TODOS los métodos disponibles (tarjeta crédito/débito,
 * saldo MP, RapiPago, PagoFácil, Western Union, transferencia, etc.).
 *
 * Usado para el flow "efectivo / mensual": cada mes generamos una
 * nueva preference, mandamos el link al alumno por email, paga, el
 * webhook activa la sub por 30 días.
 *
 * Diferencia con Preapproval:
 *   - Preapproval = auto-cobro recurrente (solo tarjeta/saldo)
 *   - Preference = one-shot, todos los métodos (incluye efectivo)
 *
 * Docs: https://www.mercadopago.com.ar/developers/es/reference/preferences/_checkout_preferences/post
 */

export type PreferenceCreateInput = {
  /** ID del usuario en nuestra DB. Va a external_reference. */
  userId: string;
  /** Email del payer (visible en MP). */
  payerEmail: string;
  /** Monto ARS pesos enteros. Default = MP_MONTHLY_ARS (30.000). */
  amountArs?: number;
  /** URLs absolutas a las que MP redirige. */
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  /** Texto del item visible en checkout MP. */
  itemTitle?: string;
};

export type PreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  external_reference: string | null;
  date_of_expiration: string | null;
  expires: boolean;
};

async function mpFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getMpAccessToken();
  return await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Crea una preference de Checkout Pro. El alumno ve TODOS los métodos
 * de pago disponibles en su país (tarjeta, débito, efectivo, etc.).
 */
export async function createPreference(
  input: PreferenceCreateInput,
): Promise<PreferenceResponse> {
  const amount = input.amountArs ?? MP_MONTHLY_ARS;
  const body = {
    items: [
      {
        id: "dap-monthly",
        title: input.itemTitle ?? "DAP — Suscripción mensual",
        quantity: 1,
        currency_id: MP_CURRENCY,
        unit_price: amount,
      },
    ],
    payer: { email: input.payerEmail },
    external_reference: input.userId,
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl,
    },
    // Devuelve auto-redirect después de pagar (no espera click).
    auto_return: "approved",
    // Expira en 7 días — más que suficiente para pagar en efectivo.
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    // Política DAP: excluimos tarjeta crédito y débito (problemas
    // recurrentes con auto-cobro AR + rechazos masivos). Dejamos solo
    // saldo MP, transferencia (CVU/CBU), RapiPago/PagoFácil, Western
    // Union, Pago Mis Cuentas.
    payment_methods: {
      excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
      installments: 1,
    },
  };

  const res = await mpFetch("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as PreferenceResponse & {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      `MP createPreference falló (${res.status}): ${data.message ?? data.error ?? "desconocido"}`,
    );
  }
  return data;
}

/**
 * GET payment by ID. Usado por el webhook para verificar el estado
 * real del pago (anti-spoof) cuando recibe notificación de payment.
 */
export type MpPayment = {
  id: number;
  status: "pending" | "approved" | "authorized" | "in_process" | "in_mediation" | "rejected" | "cancelled" | "refunded" | "charged_back" | string;
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
  payer: { email: string | null };
  payment_method_id: string;
  payment_type_id: string;
  date_approved: string | null;
  preference_id: string | null;
};

export async function getPayment(paymentId: string | number): Promise<MpPayment> {
  const res = await mpFetch(`/v1/payments/${encodeURIComponent(String(paymentId))}`);
  const data = (await res.json()) as MpPayment & {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      `MP getPayment falló (${res.status}): ${data.message ?? data.error ?? "desconocido"}`,
    );
  }
  return data;
}
