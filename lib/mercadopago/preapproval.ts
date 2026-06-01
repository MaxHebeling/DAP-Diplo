import {
  getMpAccessToken,
  MP_API_BASE,
  MP_CURRENCY,
  MP_FREQUENCY,
  MP_FREQUENCY_TYPE,
  MP_MONTHLY_ARS,
  MP_PLAN_REASON,
} from "@/lib/mercadopago/config";

/**
 * Cliente mínimo de Mercado Pago Preapproval API.
 *
 * Docs: https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post
 *
 * El flujo:
 *   1. createPreapproval() → crea registro pendiente, devuelve init_point URL
 *   2. Redirigimos al alumno a init_point
 *   3. Alumno autoriza con su tarjeta en página de MP
 *   4. MP nos avisa por webhook (preapproval.updated) cuando queda authorized
 *   5. Updateamos la fila en `subscriptions` a status=active
 */

export type PreapprovalCreateInput = {
  /** ID del usuario en nuestra DB. Lo guardamos en external_reference. */
  userId: string;
  /** Email del payer (visible en MP). */
  payerEmail: string;
  /** Monto mensual ARS en pesos enteros. Default = MP_MONTHLY_ARS. */
  amountArs?: number;
  /** URL absoluta a la que MP redirige después de autorizar. */
  backUrl: string;
  /** Texto humano visible en el resumen de MP del payer. */
  reason?: string;
};

export type PreapprovalResponse = {
  id: string;
  status:
    | "pending"
    | "authorized"
    | "paused"
    | "cancelled"
    | "finished"
    | string;
  init_point: string;
  payer_id: number | null;
  payer_email: string;
  external_reference: string | null;
  auto_recurring: {
    frequency: number;
    frequency_type: "months" | "days";
    transaction_amount: number;
    currency_id: string;
  };
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

export async function createPreapproval(
  input: PreapprovalCreateInput,
): Promise<PreapprovalResponse> {
  const amount = input.amountArs ?? MP_MONTHLY_ARS;
  const body = {
    reason: input.reason ?? MP_PLAN_REASON,
    external_reference: input.userId,
    payer_email: input.payerEmail,
    back_url: input.backUrl,
    auto_recurring: {
      frequency: MP_FREQUENCY,
      frequency_type: MP_FREQUENCY_TYPE,
      transaction_amount: amount,
      currency_id: MP_CURRENCY,
    },
    // Status `pending` → el alumno tiene que ir al init_point a autorizar.
    // Si pasamos `authorized` falla porque no tenemos el card_token desde
    // server (eso requeriría Bricks/SDK frontend).
    status: "pending",
  };
  const res = await mpFetch("/preapproval", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as PreapprovalResponse & {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      `MP createPreapproval falló (${res.status}): ${data.message ?? data.error ?? "desconocido"}`,
    );
  }
  return data;
}

export async function getPreapproval(
  preapprovalId: string,
): Promise<PreapprovalResponse> {
  const res = await mpFetch(`/preapproval/${encodeURIComponent(preapprovalId)}`);
  const data = (await res.json()) as PreapprovalResponse & {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      `MP getPreapproval falló (${res.status}): ${data.message ?? data.error ?? "desconocido"}`,
    );
  }
  return data;
}

export async function cancelPreapproval(preapprovalId: string): Promise<void> {
  const res = await mpFetch(
    `/preapproval/${encodeURIComponent(preapprovalId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    },
  );
  if (!res.ok) {
    const data = (await res.json()) as { message?: string; error?: string };
    throw new Error(
      `MP cancelPreapproval falló (${res.status}): ${data.message ?? data.error ?? "desconocido"}`,
    );
  }
}
