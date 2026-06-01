import { createPreapproval, type PreapprovalResponse } from "@/lib/mercadopago/preapproval";
import { MP_MARRIAGE_MONTHLY_ARS } from "@/lib/mercadopago/config";

/**
 * Crea preapproval MP para inscripción matrimonio AR.
 *
 * Cobra 42.000 ARS/mes a UN cónyuge (el "payer"), cubre a los 2. El
 * webhook MP, al recibir la confirmación, lee `marriage_registrations`
 * por `mp_preapproval_id` y provisiona la cuenta del cónyuge 2 + crea
 * 2 filas en `subscriptions` (una por cónyuge) con el mismo
 * `mp_preapproval_id`. Misma estrategia que el flow de Stripe.
 *
 * `external_reference` = `marriage_group_id` (no userId) → así el
 * webhook puede resolver el matrimonio sin ambigüedad.
 */
export async function createMarriagePreapproval(opts: {
  marriageGroupId: string;
  payerEmail: string;
  backUrl: string;
}): Promise<PreapprovalResponse> {
  return await createPreapproval({
    userId: opts.marriageGroupId, // se mapea a external_reference
    payerEmail: opts.payerEmail,
    amountArs: MP_MARRIAGE_MONTHLY_ARS,
    backUrl: opts.backUrl,
    reason: "DAP — Inscripción matrimonio Argentina (suscripción mensual)",
  });
}
