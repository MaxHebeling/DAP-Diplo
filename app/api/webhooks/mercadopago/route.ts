import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPreapproval } from "@/lib/mercadopago/preapproval";
import { getPayment } from "@/lib/mercadopago/preference";
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

  // Rama Payment (flow efectivo Checkout Pro). Llega cuando MP
  // confirma un pago one-shot (preference). Buscamos la sub por
  // preference_id y la activamos por 30 días.
  const isPayment = type === "payment" || type?.startsWith("payment");
  if (isPayment) {
    return await handlePaymentEvent(resourceId);
  }

  // Rama Preapproval (flow auto-cobro tarjeta).
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

/**
 * Maneja eventos `payment` (flow Checkout Pro / efectivo). Refetch del
 * payment desde MP, busca la sub por preference_id, y si está
 * approved/authorized → extiende current_period_end por 30 días y deja
 * status='active'.
 */
async function handlePaymentEvent(paymentId: string): Promise<NextResponse> {
  const admin = createAdminClient();

  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error(`[mp.webhook] getPayment failed id=${paymentId}: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Solo nos interesan pagos que cierran el ciclo. 'pending' (efectivo
  // que aún no se acreditó en RapiPago) lo ignoramos: ya tenemos la
  // sub en pending desde el onboarding y MP nos avisará de nuevo
  // cuando el cliente realmente pague.
  if (payment.status !== "approved" && payment.status !== "authorized") {
    console.log(
      `[mp.webhook] payment=${paymentId} status=${payment.status} (${payment.status_detail}) — ignorado`,
    );
    return NextResponse.json({ ok: true, ignored: `status=${payment.status}` });
  }

  // Buscamos por preference_id primero (más directo). Si no, fallback
  // a external_reference (= userId o marriage_group_id).
  const preferenceId = payment.preference_id;
  const externalRef = payment.external_reference;

  // Detectar si es matrimonio: external_reference apunta a
  // marriage_group_id O hay una marriage_registration con este
  // mp_preference_id.
  const { data: marriageReg } = await admin
    .from("marriage_registrations")
    .select("id, marriage_group_id, spouse_1_user_id, spouse_2_user_id")
    .or(
      preferenceId
        ? `mp_preference_id.eq.${preferenceId},marriage_group_id.eq.${externalRef ?? ""}`
        : `marriage_group_id.eq.${externalRef ?? ""}`,
    )
    .maybeSingle<{
      id: string;
      marriage_group_id: string;
      spouse_1_user_id: string | null;
      spouse_2_user_id: string | null;
    }>();

  if (marriageReg) {
    return await handleMarriageCashPayment({
      payment,
      preferenceId,
      marriageReg,
    });
  }

  type Row = {
    id: string;
    user_id: string;
    current_period_end: string | null;
    status: string;
  };

  let sub: Row | null = null;
  if (preferenceId) {
    const { data } = await admin
      .from("subscriptions")
      .select("id, user_id, current_period_end, status")
      .eq("mp_preference_id", preferenceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Row>();
    sub = data ?? null;
  }
  if (!sub && externalRef) {
    const { data } = await admin
      .from("subscriptions")
      .select("id, user_id, current_period_end, status")
      .eq("user_id", externalRef)
      .eq("payment_method", "checkout_pro")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Row>();
    sub = data ?? null;
  }

  if (!sub) {
    console.warn(
      `[mp.webhook] payment=${paymentId} preference=${preferenceId} extRef=${externalRef} — sub no encontrada`,
    );
    return NextResponse.json({ ok: true, ignored: "no-sub-found" });
  }

  // Extiende el período. Si ya estaba active y current_period_end es
  // futuro, sumamos al final; si no, arrancamos desde ahora.
  const now = new Date();
  const base =
    sub.current_period_end && new Date(sub.current_period_end) > now
      ? new Date(sub.current_period_end)
      : now;
  const newEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { error: updErr } = await admin
    .from("subscriptions")
    .update({
      status: "active",
      mp_payment_id: String(payment.id),
      current_period_start: now.toISOString(),
      current_period_end: newEnd.toISOString(),
      started_at: sub.status === "active" ? undefined : now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", sub.id);

  if (updErr) {
    console.error(`[mp.webhook] update cash sub failed: ${updErr.message}`);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  console.log(
    `[mp.webhook] OK payment=${paymentId} sub=${sub.id} → active until ${newEnd.toISOString()}`,
  );
  return NextResponse.json({ ok: true, periodEnd: newEnd.toISOString() });
}

/**
 * Maneja pago confirmado de un matrimonio cash (Checkout Pro).
 * Provisiona spouse 2 si falta + upsert de 2 filas en subscriptions
 * con current_period_end +30d. Idempotente.
 */
async function handleMarriageCashPayment(opts: {
  payment: Awaited<ReturnType<typeof getPayment>>;
  preferenceId: string | null;
  marriageReg: {
    id: string;
    marriage_group_id: string;
    spouse_1_user_id: string | null;
    spouse_2_user_id: string | null;
  };
}): Promise<NextResponse> {
  const { payment, preferenceId, marriageReg } = opts;
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  // Provisionar spouse 2 si no existe todavía.
  let spouse2Id: string | null = marriageReg.spouse_2_user_id;
  if (!spouse2Id) {
    try {
      spouse2Id = await provisionSpouse2ByMarriageGroup(marriageReg.marriage_group_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[mp.webhook] marriage cash provisionSpouse2 falló: ${msg}`);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const userIds = [marriageReg.spouse_1_user_id, spouse2Id].filter(
    (x): x is string => !!x,
  );

  // Calculamos el nuevo period_end. Si la sub ya existe y está active,
  // sumamos al final; si no, arrancamos desde ahora.
  const { data: existingSubs } = await admin
    .from("subscriptions")
    .select("id, user_id, current_period_end, status")
    .eq("mp_preference_id", preferenceId ?? "")
    .returns<{ id: string; user_id: string; current_period_end: string | null; status: string }[]>();

  const existingEnd = existingSubs?.[0]?.current_period_end ?? null;
  const base = existingEnd && new Date(existingEnd) > now ? new Date(existingEnd) : now;
  const newEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Borramos previas con este preference_id (idempotencia) y reinsertamos.
  if (preferenceId) {
    await admin
      .from("subscriptions")
      .delete()
      .eq("mp_preference_id", preferenceId);
  }

  const rows = userIds.map((uid) => ({
    user_id: uid,
    payment_processor: "mercadopago" as const,
    payment_method: "checkout_pro" as const,
    mp_preference_id: preferenceId,
    mp_payment_id: String(payment.id),
    status: "active",
    currency: MP_CURRENCY,
    amount_minor: MP_MARRIAGE_MONTHLY_ARS * 100,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    started_at: nowIso,
    current_period_start: nowIso,
    current_period_end: newEnd.toISOString(),
    updated_at: nowIso,
  }));

  if (rows.length > 0) {
    const { error: insErr } = await admin.from("subscriptions").insert(rows);
    if (insErr) {
      console.error(`[mp.webhook] insert marriage cash subs failed: ${insErr.message}`);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  console.log(
    `[mp.webhook] OK marriage-cash preference=${preferenceId} group=${marriageReg.marriage_group_id} → active until ${newEnd.toISOString()} (${userIds.length} filas)`,
  );
  return NextResponse.json({ ok: true, marriage: true, periodEnd: newEnd.toISOString() });
}
