/**
 * Endpoint admin: corre IA de corrección AHORA para todas las submissions
 * con status='submitted' + ai_feedback IS NULL, ignorando el delay de 48h
 * del cron normal.
 *
 * POST /api/admin/grade-now
 * Body: { submissionId?: string }  // opcional: si se pasa, solo procesa ese
 * Auth: Bearer ${CRON_SECRET}
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { correctAssignment } from "@/lib/excorrector";
import { gradeNowSchema } from "@/lib/admin/dub-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Pending = {
  id: string;
  user_id: string;
  module_id: string;
  module_section_id: string;
  content_text: string | null;
  attachment_url: string | null;
  submitted_at: string;
};

type ModuleInfo = {
  id: string;
  title: string;
  objective: string | null;
  main_revelation: string | null;
  slug: string;
};

type SectionInfo = { id: string; body_md: string | null };

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = gradeNowSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const body = parsed.data;

  const admin = createAdminClient();
  let pending: Pending[] | null = null;
  if (body.submissionId) {
    const { data } = await admin.from("assignment_submissions")
      .select("id, user_id, module_id, module_section_id, content_text, attachment_url, submitted_at")
      .eq("id", body.submissionId)
      .single<Pending>();
    pending = data ? [data] : [];
  } else {
    const { data } = await admin.from("assignment_submissions")
      .select("id, user_id, module_id, module_section_id, content_text, attachment_url, submitted_at")
      .eq("status", "submitted")
      .is("ai_feedback", null)
      .order("submitted_at", { ascending: true })
      .returns<Pending[]>();
    pending = data ?? [];
  }
  if (!pending?.length) return NextResponse.json({ ok: true, processed: 0 });

  const results: Array<{ id: string; ok: boolean; status?: string; score?: number; error?: string }> = [];
  for (const sub of pending) {
    try {
      const { data: mod } = await admin.from("modules")
        .select("id, title, objective, main_revelation, slug")
        .eq("id", sub.module_id).single<ModuleInfo>();
      const { data: sec } = await admin.from("module_sections")
        .select("id, body_md")
        .eq("id", sub.module_section_id).single<SectionInfo>();
      const { data: prof } = await admin.from("profiles")
        .select("full_name").eq("id", sub.user_id).single<{ full_name: string }>();
      if (!mod || !sec || !prof) {
        results.push({ id: sub.id, ok: false, error: "missing_refs" });
        continue;
      }

      const result = await correctAssignment({
        moduleTitle: mod.title,
        moduleObjective: mod.objective,
        mainRevelation: mod.main_revelation,
        activationBodyMd: sec.body_md,
        studentText: sub.content_text ?? "",
        studentAttachmentNote: sub.attachment_url ? `Adjunto: ${sub.attachment_url}` : undefined,
      });
      if (!result.ok) {
        results.push({ id: sub.id, ok: false, error: result.error });
        continue;
      }
      const newStatus = result.data.passed ? "completed" : "incomplete";
      await admin.from("assignment_submissions").update({
        ai_feedback: result.data.feedback_markdown,
        ai_score: result.data.score,
        ai_passed: result.data.passed,
        corrected_at: new Date().toISOString(),
        status: newStatus,
      }).eq("id", sub.id);
      results.push({ id: sub.id, ok: true, status: newStatus, score: result.data.score });
    } catch (e) {
      results.push({ id: sub.id, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
