/**
 * Devuelve una submission al alumno para que la edite y re-envíe.
 *
 * Flow:
 *  1. Admin guard
 *  2. UPDATE submission:
 *       status='open', revision_note, revision_count++, last_returned_at=now()
 *       ai_feedback / ai_score / ai_passed / corrected_at → reset (la IA va a
 *       re-correr cuando re-envíe)
 *  3. Email al alumno con la nota + link al portal
 *
 * NO toca results_sent_at (si ya estaba aprobada, no se puede devolver — el
 * UPDATE filtra por results_sent_at IS NULL).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRevisionRequestedEmail } from "@/lib/email/send-revision-requested";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";

const schema = z.object({
  revision_note: z.string().trim().min(10, "Escribí al menos 10 caracteres").max(4000),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const { id } = await ctx.params;
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const admin = createAdminClient();

  // CAS update: solo si NO está aprobada (results_sent_at IS NULL) y NO está
  // ya en open (idempotencia).
  const nowIso = new Date().toISOString();
  const { data: subRow, error: updErr } = await admin
    .from("assignment_submissions")
    .update({
      status: "open",
      revision_note: parsed.data.revision_note,
      last_returned_at: nowIso,
      revision_count: (await getCount(admin, id)) + 1,
      ai_feedback: null,
      ai_score: null,
      ai_passed: null,
      corrected_at: null,
      updated_at: nowIso,
    })
    .eq("id", id)
    .is("results_sent_at", null)
    .in("status", ["submitted", "completed", "incomplete"])
    .select("id, user_id, module_id")
    .maybeSingle<{ id: string; user_id: string; module_id: string }>();

  if (updErr) return NextResponse.json({ error: `db: ${updErr.message}` }, { status: 500 });
  if (!subRow) {
    return NextResponse.json({
      error: "No se pudo devolver — verificá que no haya sido ya aprobada o que esté entregada.",
    }, { status: 409 });
  }

  // Cargar profile + módulo para el email
  const [{ data: profile }, { data: module }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", subRow.user_id).maybeSingle<{ full_name: string }>(),
    admin.from("modules").select("title, slug, phase:phases(slug)").eq("id", subRow.module_id).maybeSingle<{ title: string; slug: string; phase: { slug: string } | null }>(),
  ]);
  const { data: au } = await admin.auth.admin.getUserById(subRow.user_id);
  const email = au?.user?.email;

  let emailResult: string | undefined;
  if (email && profile && module) {
    const portalUrl = module.phase?.slug
      ? `${APP_URL}/fases/${module.phase.slug}/modulos/${module.slug}?section=activation`
      : `${APP_URL}/dashboard`;
    const r = await sendRevisionRequestedEmail({
      to: email,
      studentName: profile.full_name,
      moduleTitle: module.title,
      revisionNote: parsed.data.revision_note,
      portalUrl,
    });
    if (!r.ok) emailResult = `email_failed: ${r.error}`;
    else emailResult = "sent";
  }

  return NextResponse.json({
    ok: true,
    submissionId: subRow.id,
    emailResult,
  });
}

async function getCount(admin: ReturnType<typeof createAdminClient>, id: string): Promise<number> {
  const { data } = await admin
    .from("assignment_submissions")
    .select("revision_count")
    .eq("id", id)
    .maybeSingle<{ revision_count: number | null }>();
  return data?.revision_count ?? 0;
}
