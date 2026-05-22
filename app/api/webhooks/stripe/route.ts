import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { sendPaymentFailedEmail } from "@/lib/email/send-payment-failed";
import { constructStripeEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

// Modelo v3.3: suscripción simple. SIN gating académico, SIN pausa automática.
//
// 5 eventos manejados:
//   customer.subscription.created  → crea fila + welcome email
//   customer.subscription.updated  → sincroniza estado de Stripe
//   customer.subscription.deleted  → status=canceled
//   invoice.paid                   → status=active (no-op si ya está)
//   invoice.payment_failed         → status=past_due + email
//
// Idempotencia: tabla stripe_events_processed (check antes + insert después).

type EventResult = {
  ok: true;
  userId?: string | null;
  detail?: string;
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Falta stripe-signature" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Firma inválida";
    console.error("[stripe.webhook] signature failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency claim atómica. Insertamos primero (con ON CONFLICT DO NOTHING)
  // antes de procesar — si la fila ya existía, otra entrega del mismo evento
  // ya lo está manejando o lo hizo. Evita la ventana de race en la que un
  // patrón SELECT-then-INSERT dejaba pasar duplicados (welcome email 2x,
  // upsert de subscription pisado, etc.).
  const { data: claimed, error: claimErr } = await admin
    .from("stripe_events_processed")
    .upsert(
      { id: event.id, event_type: event.type },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (claimErr) {
    console.error(
      `[stripe.webhook] event=${event.id} no se pudo reclamar: ${claimErr.message}`,
    );
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    console.log(
      `[stripe.webhook] event=${event.id} type=${event.type} → SKIP (already processed)`,
    );
    return NextResponse.json({ received: true, idempotent: true });
  }

  let result: EventResult;
  try {
    switch (event.type) {
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        result = await upsertSubscription(sub);
        if (result.userId) {
          const emailRes = await sendWelcomeEmail(result.userId);
          logEmail("welcome", result.userId, emailRes);
        }
        break;
      }
      case "customer.subscription.updated":
        result = await upsertSubscription(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        result = await markSubscriptionCanceled(
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.paid":
        result = await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        result = await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      case "charge.refunded":
        result = await handleChargeRefunded(
          event.data.object as Stripe.Charge,
        );
        break;
      default:
        result = { ok: true, detail: "no-handler" };
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error procesando webhook";
    console.error(
      `[stripe.webhook] event=${event.id} type=${event.type} → FAILED: ${msg}`,
    );
    // Soltar el claim para que el retry de Stripe lo pueda procesar.
    const { error: delErr } = await admin
      .from("stripe_events_processed")
      .delete()
      .eq("id", event.id);
    if (delErr) {
      console.error(
        `[stripe.webhook] event=${event.id} no se pudo soltar claim tras fallo: ${delErr.message}`,
      );
    }
    // 500 → Stripe reintenta automáticamente.
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  console.log(
    `[stripe.webhook] event=${event.id} type=${event.type} userId=${result.userId ?? "—"} → OK${result.detail ? ` (${result.detail})` : ""}`,
  );

  return NextResponse.json({ received: true });
}

// --- helpers ---------------------------------------------------------

function tsToIso(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

// En Stripe 22 los periodos viven en items.data[0], no en la Subscription.
function subscriptionPeriod(sub: Stripe.Subscription): {
  start: number | null;
  end: number | null;
} {
  const item = sub.items?.data?.[0];
  if (!item) return { start: null, end: null };
  return {
    start: item.current_period_start ?? null,
    end: item.current_period_end ?? null,
  };
}

// invoice.subscription top-level fue removido en Stripe 22.
// Ahora vive en invoice.parent.subscription_details.subscription.
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return null;
  return typeof ref === "string" ? ref : (ref.id ?? null);
}

function logEmail(
  kind: string,
  userId: string,
  res: { ok: boolean; id?: string; error?: string },
): void {
  if (res.ok) {
    console.log(
      `[stripe.webhook] email=${kind} userId=${userId} sent resend_id=${res.id}`,
    );
  } else {
    console.error(
      `[stripe.webhook] email=${kind} userId=${userId} FAILED: ${res.error}`,
    );
  }
}

async function upsertSubscription(
  sub: Stripe.Subscription,
): Promise<EventResult> {
  const userId = sub.metadata?.userId;
  if (!userId) {
    throw new Error(
      `customer.subscription.${sub.status} sin metadata.userId — sub=${sub.id}`,
    );
  }

  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) {
    throw new Error(`Subscription ${sub.id} sin price_id`);
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    throw new Error(`Subscription ${sub.id} sin customer`);
  }

  const admin = createAdminClient();

  // Inscripción matrimonio: necesitamos provisionar al cónyuge 2 antes
  // de upsertear las filas en subscriptions (queremos 2 rows, una por
  // user, ambas pegadas al mismo stripe_subscription_id).
  const userIds = [userId];
  if (sub.metadata?.registration_type === "marriage") {
    const second = await provisionSpouse2(sub);
    if (second) userIds.push(second);
  }

  const period = subscriptionPeriod(sub);
  const baseRow = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: tsToIso(period.start),
    current_period_end: tsToIso(period.end),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: tsToIso(sub.canceled_at),
  };

  const rows = userIds.map((uid) => ({ ...baseRow, user_id: uid }));
  const { error } = await admin
    .from("subscriptions")
    .upsert(rows, {
      onConflict: "stripe_subscription_id,user_id",
      ignoreDuplicates: false,
    });
  if (error) throw new Error(`Upsert subscriptions falló: ${error.message}`);

  return {
    ok: true,
    userId,
    detail: `status=${sub.status}${
      userIds.length > 1 ? ` (matrimonio, ${userIds.length} filas)` : ""
    }`,
  };
}

/**
 * Para suscripciones de matrimonio Argentina: localiza la fila en
 * marriage_registrations, crea la cuenta del cónyuge 2 (admin) si no
 * existe, le manda un magic link de invite, y devuelve su user_id.
 *
 * Idempotente: si spouse_2_user_id ya está poblado, no recrea nada.
 */
async function provisionSpouse2(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const marriageGroupId = sub.metadata?.marriage_group_id;
  if (!marriageGroupId) {
    console.warn(
      `[stripe.webhook] sub=${sub.id} registration_type=marriage pero sin marriage_group_id`,
    );
    return null;
  }

  const admin = createAdminClient();
  const { data: reg, error: regErr } = await admin
    .from("marriage_registrations")
    .select(
      "id, spouse_1_user_id, spouse_2_user_id, spouse_2_email, spouse_2_full_name, spouse_2_phone, spouse_2_province, spouse_2_ministry, marriage_group_id",
    )
    .eq("marriage_group_id", marriageGroupId)
    .maybeSingle<{
      id: string;
      spouse_1_user_id: string | null;
      spouse_2_user_id: string | null;
      spouse_2_email: string;
      spouse_2_full_name: string;
      spouse_2_phone: string;
      spouse_2_province: string;
      spouse_2_ministry: string | null;
      marriage_group_id: string;
    }>();

  if (regErr) {
    throw new Error(
      `provisionSpouse2: lookup falló para marriage_group=${marriageGroupId}: ${regErr.message}`,
    );
  }
  if (!reg) {
    console.warn(
      `[stripe.webhook] marriage_group=${marriageGroupId} no encontrado en marriage_registrations`,
    );
    return null;
  }

  // Persistir stripe_subscription_id en la fila marriage_registrations
  await admin
    .from("marriage_registrations")
    .update({
      stripe_subscription_id: sub.id,
      stripe_payment_status: sub.status,
    })
    .eq("id", reg.id);

  if (reg.spouse_2_user_id) {
    return reg.spouse_2_user_id;
  }

  // Crear cuenta del cónyuge 2 vía Admin API. invite_user_by_email
  // crea el user + envía magic link para que defina su password.
  const { data: invited, error: invErr } =
    await admin.auth.admin.inviteUserByEmail(reg.spouse_2_email, {
      data: {
        full_name: reg.spouse_2_full_name,
        ministry_name: reg.spouse_2_ministry,
        country: "Argentina",
        country_code: "AR",
        phone: reg.spouse_2_phone,
        province: reg.spouse_2_province,
        spouse_role: "spouse_2",
        marriage_group_id: reg.marriage_group_id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    });

  if (invErr) {
    // Si ya existe el email en auth.users (ej. el cónyuge ya tenía cuenta),
    // intentamos resolverlo vía admin.listUsers / getUserByEmail.
    const lower = invErr.message.toLowerCase();
    if (lower.includes("already") || lower.includes("registered")) {
      const { data: existing } = await admin.rpc("get_user_id_by_email", {
        p_email: reg.spouse_2_email,
      });
      const existingId =
        typeof existing === "string"
          ? existing
          : Array.isArray(existing)
          ? (existing[0] as { id?: string })?.id ?? null
          : null;
      if (existingId) {
        await admin
          .from("profiles")
          .update({
            marriage_group_id: reg.marriage_group_id,
            spouse_role: "spouse_2",
            province: reg.spouse_2_province,
            phone: reg.spouse_2_phone,
          })
          .eq("id", existingId);
        await admin
          .from("marriage_registrations")
          .update({
            spouse_2_user_id: existingId,
            spouse_2_provisioned_at: new Date().toISOString(),
          })
          .eq("id", reg.id);
        return existingId;
      }
    }
    throw new Error(
      `provisionSpouse2: invite falló (${reg.spouse_2_email}): ${invErr.message}`,
    );
  }

  const spouse2UserId = invited?.user?.id;
  if (!spouse2UserId) {
    throw new Error(
      `provisionSpouse2: invite no devolvió user.id para ${reg.spouse_2_email}`,
    );
  }

  // El trigger handle_new_user ya creó el profile vía raw_user_meta_data;
  // ajustamos los campos finales que el trigger no pone.
  await admin
    .from("profiles")
    .update({
      marriage_group_id: reg.marriage_group_id,
      spouse_role: "spouse_2",
      province: reg.spouse_2_province,
      phone: reg.spouse_2_phone,
    })
    .eq("id", spouse2UserId);

  await admin
    .from("marriage_registrations")
    .update({
      spouse_2_user_id: spouse2UserId,
      spouse_2_provisioned_at: new Date().toISOString(),
      spouse_2_invite_sent_at: new Date().toISOString(),
    })
    .eq("id", reg.id);

  return spouse2UserId;
}

async function markSubscriptionCanceled(
  sub: Stripe.Subscription,
): Promise<EventResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: tsToIso(sub.canceled_at) ?? new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);
  if (error) throw new Error(`Cancel subscription falló: ${error.message}`);
  return {
    ok: true,
    userId: sub.metadata?.userId ?? null,
    detail: "canceled (progreso del alumno preservado)",
  };
}

// Admin emitió un refund (full o partial) desde el dashboard de Stripe.
// Sólo actuamos en refunds FULL: revocamos acceso inmediato marcando la
// suscripción como canceled. Partial refunds las logueamos sin tocar
// status — el admin debe decidir si cancela la suscripción aparte.
//
// Nota: este evento llega también para refunds de invoice.paid procesadas
// vía Customer Portal. Tratamos todos igual: si revertieron el pago, el
// usuario pierde acceso.
async function handleChargeRefunded(
  charge: Stripe.Charge,
): Promise<EventResult> {
  const captured = charge.amount_captured ?? 0;
  const refunded = charge.amount_refunded ?? 0;
  if (captured > 0 && refunded < captured) {
    return {
      ok: true,
      detail: `partial refund (${refunded}/${captured}), no se revoca acceso`,
    };
  }

  // Stripe 22 removió charge.invoice. Resolvemos via customer_id → nuestra
  // DB. Asumimos 1 suscripción DAP activa por customer (modelo actual).
  const customerRef = charge.customer;
  const customerId =
    typeof customerRef === "string" ? customerRef : (customerRef?.id ?? null);
  if (!customerId) {
    return { ok: true, detail: "charge sin customer" };
  }

  const admin = createAdminClient();
  // Customer puede compartirse entre 2 user_ids en matrimonio AR.
  // Tomamos cualquier fila (todas comparten stripe_subscription_id).
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, status, stripe_subscription_id")
    .eq("stripe_customer_id", customerId)
    .limit(2);
  const sub = (subs as
    | Array<{
        user_id: string;
        status: string;
        stripe_subscription_id: string;
      }>
    | null)?.[0];
  if (!sub) {
    return {
      ok: true,
      detail: `customer=${customerId} no tiene subscription en DB`,
    };
  }
  if (sub.status === "canceled") {
    return {
      ok: true,
      userId: sub.user_id,
      detail: `sub=${sub.stripe_subscription_id} ya estaba canceled`,
    };
  }

  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.stripe_subscription_id);
  if (error) throw new Error(`Refund cancel falló: ${error.message}`);

  return {
    ok: true,
    userId: sub.user_id,
    detail: `refunded (${refunded}/${captured}) → acceso revocado sub=${sub.stripe_subscription_id}`,
  };
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<EventResult> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return { ok: true, detail: "invoice sin subscription" };
  const admin = createAdminClient();
  // Una sub puede tener 1 fila (individual) o 2 filas (matrimonio AR).
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subId);
  if (!subs || subs.length === 0) {
    return { ok: true, detail: `sub=${subId} no existe en DB todavía` };
  }
  await admin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);

  // Notificar a todos los user_ids asociados (los dos cónyuges en matrimonio).
  for (const row of subs) {
    const uid = (row as { user_id: string }).user_id;
    const emailRes = await sendPaymentFailedEmail(uid);
    logEmail("payment-failed", uid, emailRes);
  }

  return {
    ok: true,
    userId: (subs[0] as { user_id: string }).user_id,
    detail: `sub=${subId} → past_due (${subs.length} usuarios)`,
  };
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<EventResult> {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return { ok: true, detail: "invoice sin subscription, ignorado" };

  // Solo procesamos invoices de creación o renovación del ciclo.
  const reason = invoice.billing_reason;
  if (reason !== "subscription_create" && reason !== "subscription_cycle") {
    return {
      ok: true,
      detail: `billing_reason=${reason} ignorado (solo cuentan create/cycle)`,
    };
  }

  const admin = createAdminClient();
  // Multi-fila por matrimonio: leemos todas y operamos parejo.
  const { data: subs, error: selErr } = await admin
    .from("subscriptions")
    .select("user_id, status")
    .eq("stripe_subscription_id", subId);
  if (selErr) throw new Error(`Lookup subscription falló: ${selErr.message}`);
  if (!subs || subs.length === 0) {
    // subscription.created todavía no se procesó: 500 → Stripe retry.
    throw new Error(
      `Subscription ${subId} no existe aún — invoice.paid llegó antes de subscription.created`,
    );
  }

  const wasInactive = subs.some(
    (r) => (r as { status: string }).status !== "active",
  );
  if (wasInactive) {
    const { error: updErr } = await admin
      .from("subscriptions")
      .update({ status: "active" })
      .eq("stripe_subscription_id", subId);
    if (updErr) throw new Error(`Update status falló: ${updErr.message}`);
  }

  const firstUserId = (subs[0] as { user_id: string }).user_id;
  return {
    ok: true,
    userId: firstUserId,
    detail: `reason=${reason}${wasInactive ? " → active" : ""}${
      subs.length > 1 ? ` (${subs.length} usuarios)` : ""
    }`,
  };
}
