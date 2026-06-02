import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPreference } from "@/lib/mercadopago/preference";
import { MP_MONTHLY_ARS } from "@/lib/mercadopago/config";
import { sendMpVoucherEmail } from "@/lib/email/send-mp-voucher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Renovamos 5 días antes del vencimiento. 5 días alcanza para que el
// alumno reciba el email y pague en RapiPago/PagoFácil con tiempo.
const RENEWAL_LEAD_DAYS = 5;
// Si después del vencimiento no pagaron, después de este margen el cron
// de pausa (pause-inactive-subs) los marca como paused. NO se hace acá.
const GRACE_DAYS_AFTER_EXPIRY = 5;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

type CashSub = {
  id: string;
  user_id: string;
  current_period_end: string;
  amount_minor: number | null;
  last_voucher_sent_at: string | null;
  payment_processor: string;
  mp_preference_id: string | null;
};

/**
 * Cron diario que genera nuevos vouchers Mercado Pago para alumnos
 * argentinos que pagan en efectivo / Checkout Pro.
 *
 * Para cada sub con `payment_method='checkout_pro'`, `status='active'` y
 * `current_period_end` próximo (≤ RENEWAL_LEAD_DAYS), si no se envió
 * voucher en este ciclo:
 *   1. Crea una nueva Preference en MP por 30.000 ARS
 *   2. Updatea mp_preference_id + last_voucher_sent_at
 *   3. Manda email con el link al alumno
 *
 * Idempotente: usa last_voucher_sent_at vs current_period_end para no
 * duplicar el envío.
 *
 * Schedule: daily 12:00 UTC ≈ 9 am AR (vercel.json).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const stats = { generated: 0, errors: 0, skipped: 0 };

  const cutoff = new Date(
    now.getTime() + RENEWAL_LEAD_DAYS * 86_400_000,
  ).toISOString();

  const { data: subs } = await admin
    .from("subscriptions")
    .select(
      "id, user_id, current_period_end, amount_minor, last_voucher_sent_at, payment_processor, mp_preference_id",
    )
    .eq("payment_method", "checkout_pro")
    .eq("status", "active")
    .lt("current_period_end", cutoff)
    .gt("current_period_end", now.toISOString())
    .returns<CashSub[]>();

  // Dedup matrimonios: si 2 subs comparten el mismo mp_preference_id
  // (cónyuges del mismo matrimonio), solo procesamos al spouse_1.
  // Lo identificamos pidiendo a marriage_registrations cuál es.
  const preferenceIds = (subs ?? [])
    .map((s) => s.mp_preference_id)
    .filter((x): x is string => !!x);
  const spouse1ByPreference = new Map<string, string>();
  if (preferenceIds.length > 0) {
    const { data: marriages } = await admin
      .from("marriage_registrations")
      .select("mp_preference_id, spouse_1_user_id")
      .in("mp_preference_id", preferenceIds)
      .returns<{ mp_preference_id: string; spouse_1_user_id: string }[]>();
    for (const m of marriages ?? []) {
      spouse1ByPreference.set(m.mp_preference_id, m.spouse_1_user_id);
    }
  }

  for (const sub of subs ?? []) {
    // Skip si es matrimonio y este sub NO es del spouse_1 (evita 2 emails).
    if (sub.mp_preference_id && spouse1ByPreference.has(sub.mp_preference_id)) {
      const spouse1Id = spouse1ByPreference.get(sub.mp_preference_id);
      if (spouse1Id && spouse1Id !== sub.user_id) {
        stats.skipped++;
        continue;
      }
    }
    try {
      // Idempotencia: si ya mandamos voucher en este ciclo (entre
      // current_period_end - RENEWAL_LEAD_DAYS y current_period_end),
      // skipear.
      const periodEnd = new Date(sub.current_period_end);
      const cycleStart = new Date(
        periodEnd.getTime() - RENEWAL_LEAD_DAYS * 86_400_000,
      );
      if (
        sub.last_voucher_sent_at &&
        new Date(sub.last_voucher_sent_at) > cycleStart
      ) {
        stats.skipped++;
        continue;
      }

      // Lookup email del alumno.
      const { data: userData } = await admin.auth.admin.getUserById(sub.user_id);
      const payerEmail = userData.user?.email;
      if (!payerEmail) {
        console.error(`[mp-voucher-cron] sub=${sub.id} sin email del user`);
        stats.errors++;
        continue;
      }

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";
      const amountArs = sub.amount_minor ? sub.amount_minor / 100 : MP_MONTHLY_ARS;

      const preference = await createPreference({
        userId: sub.user_id,
        payerEmail,
        amountArs,
        successUrl: `${appUrl}/suscribirme/exito?source=mp-cash`,
        failureUrl: `${appUrl}/dashboard?error=mp-cash`,
        pendingUrl: `${appUrl}/dashboard?source=mp-cash&pending=1`,
        itemTitle: "DAP — Suscripción mensual (renovación)",
      });

      await admin
        .from("subscriptions")
        .update({
          mp_preference_id: preference.id,
          last_voucher_sent_at: now.toISOString(),
        })
        .eq("id", sub.id);

      const emailRes = await sendMpVoucherEmail({
        userId: sub.user_id,
        checkoutUrl: preference.init_point,
        amountArs,
        kind: "renewal",
        currentPeriodEnd: periodEnd,
      });
      if (!emailRes.ok) {
        console.error(
          `[mp-voucher-cron] email failed sub=${sub.id}: ${emailRes.error}`,
        );
      }

      stats.generated++;
    } catch (err) {
      stats.errors++;
      console.error(
        `[mp-voucher-cron] failed sub=${sub.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(
    `[mp-voucher-cron] generated=${stats.generated} skipped=${stats.skipped} errors=${stats.errors}`,
  );
  return NextResponse.json({ ok: true, stats, graceAfterExpiry: GRACE_DAYS_AFTER_EXPIRY });
}
