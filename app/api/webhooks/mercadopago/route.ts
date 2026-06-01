import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPreapproval } from "@/lib/mercadopago/preapproval";
import { provisionSpouse2ByMarriageGroup } from "@/lib/marriage/provision-spouse2";
import { MP_CURRENCY, MP_MARRIAGE_MONTHLY_ARS } from "@/lib/mercadopago/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Mercado Pago — notificaciones IPN.
 *
 * MP envía POST con JSON o GET con query params según versión. Ambos
 * formatos vienen así:
 *   {
 *     "type": "subscription_preapproval" | "preapproval" | "payment",
 *     "data": { "id": "<resource_id>" }
 *   }
 * o vía query: ?topic=preapproval&id=<id>
 *
 * Para nuestro flow solo nos interesan los de tipo preapproval —
 * indican que el alumno autorizó/canceló/pausó la suscripción.
 *
 * Validación: el endpoint es público, así que no podemos confiar en el
 * payload. Hacemos un GET al API de MP con el id recibido para confirmar
 * que existe y obtener el status real (anti-spoof).
 */

type WebhookBody = {
  type?: string;
  action?: string;
  data?: { id?: string | number };
  resource?: string;
  topic?: string;
};

export async function POST(request: NextRequest) {
  return await handle(request);
}

export async function GET(request: NextRequest) {
  return await handle(request);
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const queryTopic = url.searchParams.get("topic") ?? url.searchParams.get("type");
  const queryId = url.searchParams.get("id") ?? url.searchParams.get("data.id");

  let body: WebhookBody = {};
  if (request.method === "POST") {
    try {
      body = (await request.json()) as WebhookBody;
    } catch {
      body = {};
    }
  }

  const type = body.type ?? body.topic ?? queryTopic;
  const resourceId =
    body.data?.id?.toString() ?? queryId ?? extractIdFromUrl(body.resource);

  console.log(
    `[mp.webhook] type=${type ?? "?"} id=${resourceId ?? "?"} method=${request.method}`,
  );

  if (!resourceId) {
    // Nada que procesar (ping de health check de MP).
    return NextResponse.json({ ok: true, ignored: "no-id" });
  }

  // Solo procesamos eventos de preapproval. Pagos individuales del
  // recurring los ignoramos por ahora (no afectan status de la sub
  // directamente, MP los cobra automáticamente cuando está authorized).
  const isPreapproval =
    type === "preapproval" ||
    type === "subscription_preapproval" ||
    type?.startsWith("preapproval");
  if (!isPreapproval) {
    return NextResponse.json({ ok: true, ignored: `type=${type}` });
  }

  // Refetch desde MP (anti-spoof + obtenemos status real).
  let preapproval;
  try {
    preapproval = await getPreapproval(resourceId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(`[mp.webhook] getPreapproval failed id=${resourceId}: ${msg}`);
    // 500 → MP reintenta (hasta 10 veces, con backoff).
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const admin = createAdminClient();
  const mpStatus = preapproval.status;
  const externalRef = preapproval.external_reference;
  if (!externalRef) {
    console.error(
      `[mp.webhook] preapproval ${resourceId} sin external_reference`,
    );
    return NextResponse.json({ ok: true, ignored: "no-external-ref" });
  }

  const ourStatus = mapStatus(mpStatus);

  // Detectar si es matrimonio: external_reference apunta a un
  // marriage_group_id en lugar de un user_id (el endpoint onboarding
  // lo setea así para matrimonios AR).
  const { data: marriageReg } = await admin
    .from("marriage_registrations")
    .select("id, marriage_group_id, spouse_1_user_id, spouse_2_user_id")
    .eq("mp_preapproval_id", resourceId)
    .maybeSingle<{
      id: string;
      marriage_group_id: string;
      spouse_1_user_id: string | null;
      spouse_2_user_id: string | null;
    }>();

  const isMarriage = !!marriageReg;

  if (isMarriage && marriageReg) {
    // Flujo matrimonio: provisionar cónyuge 2 + crear 2 filas de sub.
    let spouse2Id: string | null = marriageReg.spouse_2_user_id;
    if (ourStatus === "active" && !spouse2Id) {
      try {
        spouse2Id = await provisionSpouse2ByMarriageGroup(
          marriageReg.marriage_group_id,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[mp.webhook] provisionSpouse2 falló: ${msg}`);
        // 500 → MP reintenta
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    const userIds = [marriageReg.spouse_1_user_id, spouse2Id].filter(
      (x): x is string => !!x,
    );
    const nowIso = new Date().toISOString();
    const baseRow = {
      payment_processor: "mercadopago" as const,
      mp_preapproval_id: resourceId,
      mp_payer_id: preapproval.payer_id?.toString() ?? null,
      status: ourStatus,
      currency: MP_CURRENCY,
      amount_minor: MP_MARRIAGE_MONTHLY_ARS * 100,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      updated_at: nowIso,
      ...(ourStatus === "active" && { started_at: nowIso }),
      ...(ourStatus === "canceled" && { canceled_at: nowIso }),
    };

    // Upsert una fila por cónyuge. Como (stripe_subscription_id, user_id)
    // es unique pero null en MP, hacemos delete+insert para idempotencia
    // sobre mp_preapproval_id.
    await admin
      .from("subscriptions")
      .delete()
      .eq("mp_preapproval_id", resourceId);

    const rows = userIds.map((uid) => ({ ...baseRow, user_id: uid }));
    if (rows.length > 0) {
      const { error: insErr } = await admin.from("subscriptions").insert(rows);
      if (insErr) {
        console.error(`[mp.webhook] insert marriage subs failed: ${insErr.message}`);
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    console.log(
      `[mp.webhook] OK marriage preapproval=${resourceId} group=${marriageReg.marriage_group_id} mp=${mpStatus} → ${ourStatus} (${userIds.length} filas)`,
    );
    return NextResponse.json({ ok: true, status: ourStatus, marriage: true });
  }

  // Flujo individual: actualiza 1 fila por mp_preapproval_id.
  const updates: Record<string, unknown> = {
    status: ourStatus,
    mp_payer_id: preapproval.payer_id?.toString() ?? null,
    updated_at: new Date().toISOString(),
  };
  if (ourStatus === "active") {
    updates.started_at = new Date().toISOString();
  }
  if (ourStatus === "canceled") {
    updates.canceled_at = new Date().toISOString();
  }

  const { error: updErr } = await admin
    .from("subscriptions")
    .update(updates)
    .eq("mp_preapproval_id", resourceId);
  if (updErr) {
    console.error(
      `[mp.webhook] update failed id=${resourceId}: ${updErr.message}`,
    );
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  console.log(
    `[mp.webhook] OK preapproval=${resourceId} userId=${externalRef} mp=${mpStatus} → ${ourStatus}`,
  );
  return NextResponse.json({ ok: true, status: ourStatus });
}

function mapStatus(mpStatus: string): string {
  switch (mpStatus) {
    case "authorized":
      return "active";
    case "pending":
      return "pending";
    case "paused":
      return "paused";
    case "cancelled":
    case "finished":
      return "canceled";
    default:
      return mpStatus;
  }
}

function extractIdFromUrl(resourceUrl: string | undefined): string | null {
  if (!resourceUrl) return null;
  const m = resourceUrl.match(/\/([^/?#]+)(?:[?#].*)?$/);
  return m ? m[1] : null;
}
