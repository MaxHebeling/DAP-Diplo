import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send";

export const runtime = "nodejs";

const schema = z.object({
  audience: z.enum(["active", "pending", "all"]),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(200),
  url: z.string().max(200).optional(),
});

/**
 * POST /api/admin/push-broadcast
 *
 * Manda una notificación push a un conjunto de alumnos:
 *   - 'active' → subs status=active|trialing
 *   - 'pending' → status=pending|paused|past_due (para reactivación)
 *   - 'all' → union de los dos
 *
 * Requiere rol admin. Devuelve resumen con sent / failed.
 */
export async function POST(request: NextRequest) {
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const statuses =
    parsed.data.audience === "active"
      ? ["active", "trialing"]
      : parsed.data.audience === "pending"
        ? ["pending", "paused", "past_due"]
        : ["active", "trialing", "pending", "paused", "past_due"];

  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id")
    .in("status", statuses);

  // Dedup user_ids (matrimonios pueden tener 2 rows por user, etc.)
  const userIds = Array.from(
    new Set((subs ?? []).map((s) => s.user_id).filter(Boolean)),
  ) as string[];

  if (userIds.length === 0) {
    return NextResponse.json({
      ok: true,
      totalUsers: 0,
      sent: 0,
      failed: 0,
    });
  }

  const result = await sendPushToUsers(userIds, {
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url || "/dashboard",
    tag: "broadcast",
    icon: "/icon-192.png",
  });

  console.log(
    `[push-broadcast] admin=${userId} audience=${parsed.data.audience} users=${userIds.length} sent=${result.sent} failed=${result.failed}`,
  );

  return NextResponse.json({ ok: true, ...result });
}
