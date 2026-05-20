import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Corre cada hora (vercel.json). Es Bearer-protegido.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

type Row = {
  id: string;
  content_text: string | null;
  attachment_url: string | null;
};

/**
 * Cierra ventanas de assignment_submissions cuyo `closes_at` ya pasó:
 *   - status='open' + sin contenido (sin content_text ni attachment_url)
 *     → status='not_submitted'
 *   - status='open' + con contenido (sin haber hecho submit)
 *     → status='incomplete'
 *   - Las que ya están en status 'submitted' / 'correcting' /
 *     'completed' / 'incomplete' / 'not_submitted' se ignoran (no
 *     tocamos historial).
 *
 * Batch grande (500) para limpiar atrasos eventuales sin perderse en
 * múltiples ticks. Si llega a tomar más de 30s con 500 rows hay un
 * problema más grande; preferimos saberlo.
 *
 * Idempotente: el WHERE `closes_at < now() AND status='open'` se vacía
 * apenas hagamos la corrida.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Trae las que ya vencieron, separadas por si tienen contenido.
  const { data: openExpired, error: fetchErr } = await admin
    .from("assignment_submissions")
    .select("id, content_text, attachment_url")
    .eq("status", "open")
    .lt("closes_at", nowIso)
    .limit(500)
    .returns<Row[]>();

  if (fetchErr) {
    return NextResponse.json(
      { error: `db: ${fetchErr.message}` },
      { status: 500 },
    );
  }
  if (!openExpired || openExpired.length === 0) {
    return NextResponse.json({ ok: true, closed: 0 });
  }

  const idsNotSubmitted: string[] = [];
  const idsIncomplete: string[] = [];

  for (const row of openExpired) {
    const hasContent =
      (row.content_text != null && row.content_text.trim().length > 0) ||
      (row.attachment_url != null && row.attachment_url.length > 0);
    (hasContent ? idsIncomplete : idsNotSubmitted).push(row.id);
  }

  // Update batch — uso 2 calls para evitar CASE WHEN en SQL.
  if (idsNotSubmitted.length > 0) {
    const { error } = await admin
      .from("assignment_submissions")
      .update({ status: "not_submitted", updated_at: nowIso })
      .in("id", idsNotSubmitted);
    if (error) {
      return NextResponse.json(
        { error: `update not_submitted: ${error.message}` },
        { status: 500 },
      );
    }
  }
  if (idsIncomplete.length > 0) {
    const { error } = await admin
      .from("assignment_submissions")
      .update({ status: "incomplete", updated_at: nowIso })
      .in("id", idsIncomplete);
    if (error) {
      return NextResponse.json(
        { error: `update incomplete: ${error.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    closed: openExpired.length,
    not_submitted: idsNotSubmitted.length,
    incomplete: idsIncomplete.length,
  });
}
