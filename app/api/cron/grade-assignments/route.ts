import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { correctAssignment } from "@/lib/excorrector";
import { sendAssignmentFeedbackEmail } from "@/lib/email/send-assignment-feedback";
import { sendPushToUser } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Claude tarda ~10s/tarea × 20 = ~200s

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

const BATCH_SIZE = 20;
const DELAY_HOURS = 48;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dapglobal.org";

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
  block: { slug: string } | null;
  slug: string;
};

type SectionInfo = {
  id: string;
  body_md: string | null;
};

type UserInfo = {
  email: string;
  full_name: string;
};

/**
 * Cron que corre cada hora. Procesa hasta BATCH_SIZE entregas que:
 *   - status = 'submitted'
 *   - submitted_at <= now() - 48h
 *   - results_sent_at IS NULL
 *
 * Para cada una:
 *   1. status='correcting' (visible en admin como "en proceso")
 *   2. Carga módulo + consigna de la activación + datos del alumno
 *   3. correctAssignment() → feedback + score + passed (via Claude)
 *   4. UPDATE ai_feedback, ai_score, ai_passed, corrected_at,
 *      status='completed'/'incomplete'
 *   5. Email al alumno con link al módulo
 *   6. results_sent_at = now()
 *
 * Idempotente: el WHERE de selección excluye ya procesadas. Si falla
 * a mitad, los rows quedan en status='correcting' y el cron retoma —
 * podríamos quedar en loop si algo está roto en el LLM, pero el batch
 * cap y el timeout de maxDuration lo limitan.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoffIso = new Date(Date.now() - DELAY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: pending, error: fetchErr } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, module_id, module_section_id, content_text, attachment_url, submitted_at",
    )
    .eq("status", "submitted")
    .is("results_sent_at", null)
    .lte("submitted_at", cutoffIso)
    .order("submitted_at", { ascending: true })
    .limit(BATCH_SIZE)
    .returns<Pending[]>();

  if (fetchErr) {
    return NextResponse.json(
      { error: `db: ${fetchErr.message}` },
      { status: 500 },
    );
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const sub of pending) {
    try {
      // 1. Marcar en proceso
      await admin
        .from("assignment_submissions")
        .update({ status: "correcting", updated_at: new Date().toISOString() })
        .eq("id", sub.id);

      // 2. Cargar contexto del módulo + sección
      const { data: mod } = await admin
        .from("modules")
        .select(
          "id, title, slug, objective, main_revelation, block:blocks(slug)",
        )
        .eq("id", sub.module_id)
        .maybeSingle<ModuleInfo>();

      const { data: sec } = await admin
        .from("module_sections")
        .select("id, body_md")
        .eq("id", sub.module_section_id)
        .maybeSingle<SectionInfo>();

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", sub.user_id)
        .maybeSingle<{ full_name: string }>();

      const { data: authUser } = await admin
        .from("admissions")
        .select("email")
        .eq("user_id", sub.user_id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ email: string }>();

      const userInfo: UserInfo = {
        email: authUser?.email ?? "",
        full_name: profile?.full_name ?? "Estudiante",
      };

      if (!mod) throw new Error(`módulo no encontrado: ${sub.module_id}`);

      // 3. Llamar al excorrector
      const correction = await correctAssignment({
        moduleTitle: mod.title,
        moduleObjective: mod.objective,
        mainRevelation: mod.main_revelation,
        activationBodyMd: sec?.body_md ?? null,
        studentText: sub.content_text ?? "",
        studentAttachmentNote: sub.attachment_url
          ? "adjuntó un archivo además del texto"
          : undefined,
      });

      if (!correction.ok) {
        // Volver a 'submitted' para que se reintente la próxima corrida
        await admin
          .from("assignment_submissions")
          .update({
            status: "submitted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
        results.push({ id: sub.id, ok: false, error: correction.error });
        console.error(
          `[cron/grade] ${sub.id} LLM falló: ${correction.error}`,
        );
        continue;
      }

      const { feedback_markdown, score, passed, notes_for_admin } =
        correction.data;
      const finalStatus = passed ? "completed" : "incomplete";

      // 4. Persistir feedback
      const nowIso = new Date().toISOString();
      const { error: updErr } = await admin
        .from("assignment_submissions")
        .update({
          status: finalStatus,
          ai_feedback: feedback_markdown,
          ai_score: score,
          ai_passed: passed,
          corrected_at: nowIso,
          results_sent_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", sub.id);
      if (updErr) throw new Error(`update: ${updErr.message}`);

      // 4b. Si aprobó la activación: section_progress.completed = true.
      //     Para el módulo: la cascada al rango se dispara cuando alumno
      //     aprueba la EVALUACIÓN (ahí corre runQuizPassedCascade). Acá
      //     solo marcamos esta sección — el módulo se completa cuando
      //     las 5 secciones (incluida la evaluation aprobada) lo estén.
      if (passed) {
        const { error: spErr } = await admin
          .from("section_progress")
          .upsert(
            {
              user_id: sub.user_id,
              module_section_id: sub.module_section_id,
              completed: true,
              completed_at: nowIso,
            },
            { onConflict: "user_id,module_section_id" },
          );
        if (spErr) {
          console.error(
            `[cron/grade] ${sub.id} section_progress upsert: ${spErr.message}`,
          );
        }
      }

      // 5. Email al alumno (best-effort)
      const moduleRelPath = mod.block
        ? `/fases/${mod.block.slug}/modulos/${mod.slug}?section=activation`
        : `/dashboard`;
      if (userInfo.email) {
        const emailRes = await sendAssignmentFeedbackEmail({
          to: userInfo.email,
          fullName: userInfo.full_name,
          moduleTitle: mod.title,
          moduleHref: `${APP_URL}${moduleRelPath}`,
          passed,
          score,
        });
        if (!emailRes.ok) {
          console.error(
            `[cron/grade] email ${sub.id} falló: ${emailRes.error}`,
          );
        }
      }

      // 5b. Push notification (paralelo al email)
      await sendPushToUser(sub.user_id, {
        title: passed
          ? `✓ Tu tarea fue aprobada (${score}/100)`
          : `Tu corrección llegó (${score}/100)`,
        body: `${mod.title} — El Ap. Max te dejó feedback. Tocá para verlo.`,
        url: moduleRelPath,
        tag: `grade-${sub.module_id}`,
      });

      if (notes_for_admin) {
        console.log(
          `[cron/grade] ${sub.id} notes_for_admin: ${notes_for_admin}`,
        );
      }

      results.push({ id: sub.id, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error(`[cron/grade] ${sub.id} excepción: ${msg}`);
      // Volver a 'submitted' para retry futuro
      await admin
        .from("assignment_submissions")
        .update({
          status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      results.push({ id: sub.id, ok: false, error: msg });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: ok,
    failed: results.length - ok,
  });
}
