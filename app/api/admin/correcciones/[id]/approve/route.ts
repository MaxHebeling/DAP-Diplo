import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAssignmentFeedbackEmail } from "@/lib/email/send-assignment-feedback";
import { sendPushToUser } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://dap-diplo.vercel.app";

const schema = z.object({
  ai_feedback: z.string().min(10).max(20000),
  ai_passed: z.boolean(),
  ai_score: z.number().min(0).max(10),
});

type SubmissionRow = {
  id: string;
  user_id: string;
  module_id: string;
  module_section_id: string;
};

type ModuleInfo = {
  title: string;
  slug: string;
  phase: { slug: string } | null;
};

type ProfileInfo = { full_name: string };

/**
 * Aprueba una corrección IA y la libera al alumno.
 *
 * Flow:
 *  1) Admin guard
 *  2) UPDATE ATÓMICO: persiste feedback EDITADO + status + results_sent_at
 *     en un solo statement con CAS (.is('results_sent_at', null)). Esto
 *     hace de doble función: idempotencia (segunda aprobación falla 409)
 *     y atomicidad (alumno no ve "approved" hasta que TODO el UPDATE pasó).
 *  3) Si passed → upsert section_progress(completed=true).
 *  4) Email + push al alumno (después del UPDATE — si fallan, el alumno
 *     ya tiene el feedback visible y el admin puede reintentar email
 *     manualmente sin romper estado).
 *
 * El cambio vs versión anterior (que tenía dos UPDATEs separados): si el
 * segundo UPDATE de results_sent_at fallaba o la request se abortaba
 * entre medio, el admin podía re-aprobar y mandar dos emails. Ahora el
 * CAS lo bloquea a nivel de DB.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // 1. Admin guard
  const { admin: isAdmin, userId } = await requireAdmin();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  // 2. Parse
  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const finalStatus = parsed.data.ai_passed ? "completed" : "incomplete";

  // 3. UPDATE ATÓMICO con CAS:
  //    - .eq('id', id) — la submission
  //    - .is('results_sent_at', null) — todavía no aprobada
  //    - .select() — devuelve las filas afectadas; 0 filas = ya aprobada o no existe
  //
  //    Esto reemplaza el patrón anterior (SELECT existence → UPDATE feedback →
  //    UPDATE results_sent_at). El doble UPDATE permitía race conditions.
  const { data: updated, error: updErr } = await admin
    .from("assignment_submissions")
    .update({
      ai_feedback: parsed.data.ai_feedback,
      ai_passed: parsed.data.ai_passed,
      ai_score: parsed.data.ai_score,
      status: finalStatus,
      results_sent_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", id)
    .is("results_sent_at", null)
    .select("id, user_id, module_id, module_section_id")
    .returns<SubmissionRow[]>();

  if (updErr) {
    return NextResponse.json(
      { error: `update: ${updErr.message}` },
      { status: 500 },
    );
  }
  if (!updated || updated.length === 0) {
    // 0 rows afectadas: o la submission no existe (id inválido) o ya
    // tenía results_sent_at != null (ya aprobada). Distinguimos con un
    // SELECT chiquito para devolver el 404 vs 409 correcto.
    const { data: existing } = await admin
      .from("assignment_submissions")
      .select("results_sent_at")
      .eq("id", id)
      .maybeSingle<{ results_sent_at: string | null }>();
    if (!existing) {
      return NextResponse.json({ error: "no encontrada" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "ya fue aprobada y enviada al alumno" },
      { status: 409 },
    );
  }
  const sub = updated[0];

  // 4. Cargar datos contextuales para email/push.
  //    Email viene de auth.users (fuente de verdad), no de admissions
  //    — un alumno puede haber actualizado su email post-admisión.
  const [moduleRes, profileRes, userRes] = await Promise.all([
    admin
      .from("modules")
      .select("title, slug, phase:phases(slug)")
      .eq("id", sub.module_id)
      .maybeSingle<ModuleInfo>(),
    admin
      .from("profiles")
      .select("full_name")
      .eq("id", sub.user_id)
      .maybeSingle<ProfileInfo>(),
    admin.auth.admin.getUserById(sub.user_id),
  ]);

  const mod = moduleRes.data;
  const studentName = profileRes.data?.full_name ?? "Estudiante";
  const studentEmail = userRes.data?.user?.email ?? "";

  // 5. Si passed → marcar section_progress. Si falla, no rompemos el
  //    flujo: el feedback ya está visible y el admin recibe el warning
  //    en la respuesta para reintentar manualmente.
  let sectionProgressWarning: string | null = null;
  if (parsed.data.ai_passed) {
    const { error: spErr } = await admin.from("section_progress").upsert(
      {
        user_id: sub.user_id,
        module_section_id: sub.module_section_id,
        completed: true,
        completed_at: nowIso,
      },
      { onConflict: "user_id,module_section_id", ignoreDuplicates: false },
    );
    if (spErr) {
      sectionProgressWarning = `section_progress upsert falló: ${spErr.message}`;
      console.error(`[approve] ${sub.id} ${sectionProgressWarning}`);
    }
  }

  // 6. Email
  let emailSent = false;
  if (studentEmail && mod) {
    const moduleHref = `${APP_URL}/fases/${mod.phase?.slug ?? "fase-1"}/modulos/${mod.slug}`;
    const emailRes = await sendAssignmentFeedbackEmail({
      to: studentEmail,
      fullName: studentName,
      moduleTitle: mod.title,
      moduleHref,
      passed: parsed.data.ai_passed,
      score: parsed.data.ai_score,
    });
    emailSent = emailRes.ok;
    if (!emailRes.ok) {
      console.error(
        `[approve] email falló para ${sub.id}: ${emailRes.error}`,
      );
    }
  }

  // 7. Push (best-effort)
  if (mod) {
    await sendPushToUser(sub.user_id, {
      title: parsed.data.ai_passed
        ? "Tu tarea fue aprobada"
        : "Tu corrección llegó",
      body: `Módulo: ${mod.title}`,
      url: `/fases/${mod.phase?.slug ?? "fase-1"}/modulos/${mod.slug}`,
      tag: `correction-${sub.id}`,
    }).catch((err: unknown) => {
      console.error(
        `[approve] push falló: ${err instanceof Error ? err.message : "unknown"}`,
      );
    });
  }

  return NextResponse.json({
    ok: true,
    emailSent,
    passed: parsed.data.ai_passed,
    ...(sectionProgressWarning ? { warning: sectionProgressWarning } : {}),
  });
}
