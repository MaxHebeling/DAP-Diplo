import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPreapproval } from "@/lib/mercadopago/preapproval";

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
  const userId = preapproval.external_reference;
  if (!userId) {
    console.error(
      `[mp.webhook] preapproval ${resourceId} sin external_reference (userId)`,
    );
    return NextResponse.json({ ok: true, ignored: "no-external-ref" });
  }

  // Mapear MP status → nuestro status interno.
  const ourStatus = mapStatus(mpStatus);

  const updates: Record<string, unknown> = {
    status: ourStatus,
    mp_payer_id: preapproval.payer_id?.toString() ?? null,
    updated_at: new Date().toISOString(),
  };
  if (ourStatus === "active") {
    updates.started_at = updates.started_at ?? new Date().toISOString();
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
    `[mp.webhook] OK preapproval=${resourceId} userId=${userId} mp=${mpStatus} → ${ourStatus}`,
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
