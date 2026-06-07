import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/send";

export const runtime = "nodejs";

const schema = z.object({
  // Target: por email O userId (uno de los dos)
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  title: z.string().min(1).max(120).default("DAP — prueba"),
  body: z.string().min(1).max(300).default("Esto es una notificación de prueba."),
  url: z.string().min(1).max(500).default("/dashboard"),
  tag: z.string().max(100).optional(),
});

/**
 * Manda un push de prueba a un usuario específico. Auth: admin only.
 *
 * Body:
 *   { email?: string, userId?: string, title?, body?, url?, tag? }
 *
 * Devuelve: { total, sent, failed, expiredCleaned }
 */
export async function POST(request: NextRequest) {
  // 1. Auth admin
  const { admin: isAdmin, userId: callerId } = await requireAdmin();
  if (!callerId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  // 2. Parse
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  if (!parsed.data.email && !parsed.data.userId) {
    return NextResponse.json(
      { error: "Debe pasar email o userId" },
      { status: 400 },
    );
  }

  // 3. Resolver userId desde email si fue lo que vino
  let userId = parsed.data.userId;
  if (!userId && parsed.data.email) {
    const admin = createAdminClient();
    const { data: resolved } = await admin.rpc("get_user_id_by_email", {
      p_email: parsed.data.email,
    });
    if (typeof resolved === "string") {
      userId = resolved;
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: "No se encontró el usuario destino" },
      { status: 404 },
    );
  }

  // 4. Send
  const result = await sendPushToUser(userId, {
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
    tag: parsed.data.tag,
  });

  return NextResponse.json({
    ok: true,
    userId,
    ...result,
  });
}
