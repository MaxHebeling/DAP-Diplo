import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDapOfferEmail } from "@/lib/email/send-dap-offer";

export const runtime = "nodejs";

/**
 * POST /api/admin/leads/[id]/send-offer
 *
 * Manda el email "Oferta DAP" al lead. Requiere admin auth + rol.
 * Persiste offered_at, status='offered' y el message_id de Resend
 * para auditoría posterior. Idempotente a nivel admin (devuelve 200
 * con `alreadyOffered: true` si ya se mandó, sin reenviar).
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const { admin: isAdmin, userId } = await requireAdmin();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .select(
      "id, email, full_name, country, country_code, offered_at, offered_email_id, status",
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      email: string;
      full_name: string | null;
      country: string | null;
      country_code: string | null;
      offered_at: string | null;
      offered_email_id: string | null;
      status: string;
    }>();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }
  if (lead.offered_at) {
    return NextResponse.json({
      ok: true,
      alreadyOffered: true,
      messageId: lead.offered_email_id,
    });
  }

  const firstName = lead.full_name?.split(" ")[0]?.trim() ?? null;
  const result = await sendDapOfferEmail({
    to: lead.email,
    firstName,
    country: lead.country,
    countryCode: lead.country_code,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: `Resend falló: ${result.error}` },
      { status: 502 },
    );
  }

  await admin
    .from("leads")
    .update({
      offered_at: new Date().toISOString(),
      offered_email_id: result.id,
      status: "offered",
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, messageId: result.id });
}
