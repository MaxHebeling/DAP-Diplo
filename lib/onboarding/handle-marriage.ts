import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { isArgentinePhone } from "@/lib/data/argentina";
import { createPreapproval } from "@/lib/mercadopago/preapproval";
import { createPreference } from "@/lib/mercadopago/preference";
import { MP_MARRIAGE_MONTHLY_ARS } from "@/lib/mercadopago/config";
import { validateCoupon } from "@/lib/coupons/validate";
import { sendMpVoucherEmail } from "@/lib/email/send-mp-voucher";
import { provisionSpouse2ByMarriageGroup } from "@/lib/marriage/provision-spouse2";

import type { MarriagePayload } from "./schemas";
import { getGeoIpCountry } from "./validate-marriage";

const HUNDRED_YEARS_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export type HandleMarriageResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string; status: number };

/**
 * Orquesta el flow completo del matrimonio AR post-signup:
 *
 *   1) Insertar marriage_registrations con datos de ambos + flags geo
 *   2) Marcar spouse_1 en profiles (marriage_group_id + spouse_role)
 *   3) Branch beca (cupón válido) → activar sub +100 años, provisionar
 *      spouse2 inline, skipear MP entero
 *   4) Branch sin beca:
 *      - 'cash' → MP Preference (Checkout Pro)
 *      - 'card' (default) → MP Preapproval (auto-cobro)
 *
 * Devuelve `checkoutUrl` para redirigir al alumno. El spouse_2 se
 * provisiona desde el webhook MP cuando el pago se confirma (excepto
 * en la rama beca donde se hace inline).
 */
export async function handleMarriage(
  request: NextRequest,
  data: MarriagePayload,
  user: User,
  stripeCustomerId: string,
  appUrl: string,
): Promise<HandleMarriageResult> {
  const admin = createAdminClient();
  const geoCountry = getGeoIpCountry(request);

  // 1. Calcular verification flags + status
  const verificationFlags: string[] = [];
  let verificationStatus: "verified_argentina" | "pending_review" =
    "verified_argentina";

  if (!geoCountry) {
    verificationFlags.push("geoip_unknown");
    verificationStatus = "pending_review";
  } else if (geoCountry.toUpperCase() !== "AR") {
    verificationFlags.push(`geoip_mismatch:${geoCountry}`);
    verificationStatus = "pending_review";
  }
  if (!isArgentinePhone(data.spouse1.phone)) {
    verificationFlags.push("spouse1_phone_non_ar");
    verificationStatus = "pending_review";
  }
  if (!isArgentinePhone(data.spouse2.phone)) {
    verificationFlags.push("spouse2_phone_non_ar");
    verificationStatus = "pending_review";
  }

  // 2. Persistir marriage_registrations
  const { data: regRow, error: regErr } = await admin
    .from("marriage_registrations")
    .insert({
      spouse_1_user_id: user.id,
      spouse_1_full_name: data.spouse1.fullName,
      spouse_1_email: data.spouse1.email.toLowerCase(),
      spouse_1_phone: data.spouse1.phone,
      spouse_1_province: data.spouse1.province,
      spouse_1_ministry: data.spouse1.ministry ?? null,

      spouse_2_full_name: data.spouse2.fullName,
      spouse_2_email: data.spouse2.email.toLowerCase(),
      spouse_2_phone: data.spouse2.phone,
      spouse_2_province: data.spouse2.province,
      spouse_2_ministry: data.spouse2.ministry ?? null,

      country: "Argentina",
      country_code: "AR",
      geoip_country: geoCountry,
      declared_residence_in_ar: data.declaredResidenceInAr,
      verification_status: verificationStatus,
      verification_flags: verificationFlags,

      payment_processor: "mercadopago",
      currency: "ARS",
      final_amount_ars: MP_MARRIAGE_MONTHLY_ARS,
      stripe_customer_id: stripeCustomerId,
      argentina_discount_applied: true,
      final_amount_usd: 35,
    })
    .select("id, marriage_group_id")
    .single<{ id: string; marriage_group_id: string }>();

  if (regErr || !regRow) {
    return {
      ok: false,
      status: 500,
      error: `No se pudo registrar el matrimonio: ${regErr?.message ?? "row vacía"}`,
    };
  }

  // 3. Marcar spouse_1
  await admin
    .from("profiles")
    .update({
      marriage_group_id: regRow.marriage_group_id,
      spouse_role: "spouse_1",
      province: data.spouse1.province,
      phone: data.spouse1.phone,
    })
    .eq("id", user.id);

  // 4. Branch beca matrimonio (DAP-VIP / DAP-HONOR cubren a los 2)
  const coupon = validateCoupon(data.coupon ?? null);
  if (coupon.valid) {
    return await grantMarriageScholarship({
      marriageGroupId: regRow.marriage_group_id,
      marriageRegId: regRow.id,
      payerUserId: user.id,
      stripeCustomerId,
      appUrl,
    });
  }

  // 5. Branch pago
  const paymentMethod = data.paymentMethod ?? "card";
  if (paymentMethod === "cash") {
    return await startMarriageCash({
      marriageGroupId: regRow.marriage_group_id,
      marriageRegId: regRow.id,
      payerUserId: user.id,
      payerEmail: data.email,
      appUrl,
    });
  }
  return await startMarriageCard({
    marriageGroupId: regRow.marriage_group_id,
    marriageRegId: regRow.id,
    payerEmail: data.email,
    appUrl,
  });
}

async function grantMarriageScholarship({
  marriageGroupId,
  marriageRegId,
  payerUserId,
  stripeCustomerId,
  appUrl,
}: {
  marriageGroupId: string;
  marriageRegId: string;
  payerUserId: string;
  stripeCustomerId: string;
  appUrl: string;
}): Promise<HandleMarriageResult> {
  const admin = createAdminClient();

  // Provisionar spouse_2 inline — sin pago, no esperamos webhook.
  let spouse2Id: string | null = null;
  try {
    spouse2Id = await provisionSpouse2ByMarriageGroup(marriageGroupId);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Error provisionando cónyuge 2";
    return { ok: false, status: 500, error: msg };
  }

  const userIds = [payerUserId, spouse2Id].filter((x): x is string => !!x);
  const nowIso = new Date().toISOString();
  const farFuture = new Date(Date.now() + HUNDRED_YEARS_MS).toISOString();

  const { error: insErr } = await admin.from("subscriptions").insert(
    userIds.map((uid) => ({
      user_id: uid,
      payment_processor: "mercadopago",
      payment_method: "checkout_pro",
      status: "active",
      currency: "ARS",
      amount_minor: 0,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: null,
      stripe_price_id: null,
      started_at: nowIso,
      current_period_start: nowIso,
      current_period_end: farFuture,
    })),
  );
  if (insErr) {
    return {
      ok: false,
      status: 500,
      error: `No se pudo registrar la beca matrimonio: ${insErr.message}`,
    };
  }

  await admin
    .from("marriage_registrations")
    .update({
      payment_processor: "mercadopago",
      currency: "ARS",
      final_amount_ars: 0,
    })
    .eq("id", marriageRegId);

  return {
    ok: true,
    checkoutUrl: `${appUrl}/dashboard?toast=beca-activa&type=marriage`,
  };
}

async function startMarriageCash({
  marriageGroupId,
  marriageRegId,
  payerUserId,
  payerEmail,
  appUrl,
}: {
  marriageGroupId: string;
  marriageRegId: string;
  payerUserId: string;
  payerEmail: string;
  appUrl: string;
}): Promise<HandleMarriageResult> {
  const admin = createAdminClient();
  try {
    const preference = await createPreference({
      userId: marriageGroupId, // external_reference = marriage_group_id
      payerEmail,
      amountArs: MP_MARRIAGE_MONTHLY_ARS,
      successUrl: `${appUrl}/dashboard?toast=mp-paid&type=marriage`,
      failureUrl: `${appUrl}/suscribirme?error=mp-cash`,
      pendingUrl: `${appUrl}/dashboard?toast=mp-pending&type=marriage`,
      itemTitle: "DAP — Inscripción matrimonio Argentina (primer pago)",
    });
    await admin
      .from("marriage_registrations")
      .update({
        mp_preference_id: preference.id,
        payment_processor: "mercadopago",
      })
      .eq("id", marriageRegId);

    // Voucher al spouse_1 (payer). Spouse 2 se invita post-pago vía webhook.
    void sendMpVoucherEmail({
      userId: payerUserId,
      checkoutUrl: preference.init_point,
      amountArs: MP_MARRIAGE_MONTHLY_ARS,
      kind: "initial",
      currentPeriodEnd: null,
    });

    return { ok: true, checkoutUrl: preference.init_point };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando preference MP";
    return { ok: false, status: 502, error: msg };
  }
}

async function startMarriageCard({
  marriageGroupId,
  marriageRegId,
  payerEmail,
  appUrl,
}: {
  marriageGroupId: string;
  marriageRegId: string;
  payerEmail: string;
  appUrl: string;
}): Promise<HandleMarriageResult> {
  const admin = createAdminClient();
  try {
    const preapproval = await createPreapproval({
      userId: marriageGroupId, // external_reference = marriage_group_id
      payerEmail,
      amountArs: MP_MARRIAGE_MONTHLY_ARS,
      backUrl: `${appUrl}/dashboard?toast=mp-paid&type=marriage`,
      reason: "DAP — Inscripción matrimonio Argentina (suscripción mensual)",
    });
    await admin
      .from("marriage_registrations")
      .update({
        mp_preapproval_id: preapproval.id,
        payment_processor: "mercadopago",
        currency: "ARS",
        final_amount_ars: MP_MARRIAGE_MONTHLY_ARS,
      })
      .eq("id", marriageRegId);
    return { ok: true, checkoutUrl: preapproval.init_point };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error creando preapproval MP";
    return { ok: false, status: 502, error: msg };
  }
}
