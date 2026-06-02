import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Política DAP: nadie tiene cuenta sin pagar (o tener cupón válido).
// Si un alumno se inscribió pero no completó el pago en este plazo,
// borramos la cuenta para que pueda registrarse de cero más adelante.
// 48h es suficiente para que:
//   - El cron mp-monthly-voucher reenvíe el voucher
//   - El alumno reciba email recordatorio
//   - Casos legítimos: pagar en RapiPago tarda hasta 48hs en acreditar
const GRACE_HOURS = 48;

// Whitelist: no borrar ciertos emails aunque cumplan el criterio
// (cuentas admin / test / oficina).
const PROTECTED_EMAILS = new Set([
  "maxhebeling@gmail.com",
  "embajadormax@amppbr.org",
  "info@editorialreino.com",
  "drhebeling@dapglobal.org",
]);

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

/**
 * Borra cuentas huérfanas: registradas hace >48h sin sub activa, sin
 * marriage_registration en flow pendiente, no en whitelist.
 *
 * Schedule: daily 15:00 UTC ≈ 8 am SD (vercel.json).
 *
 * Idempotente.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - GRACE_HOURS * 3_600_000).toISOString();
  const stats = { scanned: 0, deleted: 0, kept: 0, errors: 0 };

  // 1) Listar todos los users creados antes del cutoff
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listErr) {
    console.error("[cleanup-cron] listUsers failed:", listErr.message);
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  for (const u of users?.users ?? []) {
    if (new Date(u.created_at) >= new Date(cutoff)) continue;
    stats.scanned++;

    if (u.email && PROTECTED_EMAILS.has(u.email.toLowerCase())) {
      stats.kept++;
      continue;
    }

    // ¿Tiene sub activa, trialing, pending o paused?
    const { count: subCount } = await admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .in("status", ["active", "trialing", "pending", "paused"]);
    if ((subCount ?? 0) > 0) {
      stats.kept++;
      continue;
    }

    // ¿Es spouse de un matrimonio? (puede que la sub esté del spouse_1
    // pero el spouse_2 todavía no la tenga)
    const { data: profile } = await admin
      .from("profiles")
      .select("marriage_group_id, role")
      .eq("id", u.id)
      .maybeSingle<{ marriage_group_id: string | null; role: string | null }>();
    if (profile?.marriage_group_id) {
      stats.kept++;
      continue;
    }
    // Admin no se borra nunca.
    if (profile?.role === "admin") {
      stats.kept++;
      continue;
    }

    // Borrar: admissions + auth.users (cascadea a profiles)
    try {
      if (u.email) {
        await admin.from("admissions").delete().eq("email", u.email);
      }
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (delErr) {
        stats.errors++;
        console.error(
          `[cleanup-cron] deleteUser ${u.email} failed: ${delErr.message}`,
        );
        continue;
      }
      stats.deleted++;
      console.log(`[cleanup-cron] deleted orphan user=${u.email} id=${u.id}`);
    } catch (err) {
      stats.errors++;
      console.error(
        `[cleanup-cron] error ${u.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(
    `[cleanup-cron] scanned=${stats.scanned} deleted=${stats.deleted} kept=${stats.kept} errors=${stats.errors}`,
  );
  return NextResponse.json({ ok: true, stats, graceHours: GRACE_HOURS });
}
