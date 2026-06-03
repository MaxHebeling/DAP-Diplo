import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
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

type Submission = {
  id: string;
  user_id: string;
  module_id: string;
  module_section_id: string;
  results_sent_at: string | null;
};

type ModuleInfo = {
  title: string;
  slug: string;
  phase: { slug: string } | null;
};

type ProfileInfo = { full_name: string };
type EmailInfo = { email: string };

/**
 * Aprueba una corrección IA y la libera al alumno.
 *
 * Flow:
 *  1) Admin guard
 *  2) Persiste feedback EDITADO + ai_passed + ai_score
 *  3) Si passed → upsert section_progress(completed=true) — desbloquea
 *     la siguiente sección/módulo cuando el alumno entre al player.
 *  4) Email al alumno con link al módulo
 *  5) Push (best-effort)
 *  6) Marca results_sent_at = now() (esto cierra el bucle: la submission
 *     ya no aparece en /admin/correcciones).
 *
 * Idempotente por: si ya tiene results_sent_at, retorna 409 — el admin
 * no puede aprobar dos veces la misma corrección.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // 1. Admin guard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  // 2. Parse + load
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

  const { data: sub, error: subErr } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, module_id, module_section_id, results_sent_at",
    )
    .eq("id", id)
    .maybeSingle<Submission>();
  if (subErr) {
    return NextResponse.json(
      { error: `db: ${subErr.message}` },
      { status: 500 },
    );
  }
  if (!sub) {
    return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  }
  if (sub.results_sent_at) {
    return NextResponse.json(
      { error: "ya fue aprobada y enviada al alumno" },
      { status: 409 },
    );
  }

  // 3. Persistir feedback editado + status final
  const nowIso = new Date().toISOString();
  const finalStatus = parsed.data.ai_passed ? "completed" : "incomplete";
  const { error: updErr } = await admin
    .from("assignment_submissions")
    .update({
      ai_feedback: parsed.data.ai_feedback,
      ai_passed: parsed.data.ai_passed,
      ai_score: parsed.data.ai_score,
      status: finalStatus,
      updated_at: nowIso,
    })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json(
      { error: `update: ${updErr.message}` },
      { status: 500 },
    );
  }

  // 4. Cargar datos contextuales para email/push
  const [moduleRes, profileRes, admissionRes] = await Promise.all([
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
    admin
      .from("admissions")
      .select("email")
      .eq("user_id", sub.user_id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle<EmailInfo>(),
  ]);

  const mod = moduleRes.data;
  const studentName = profileRes.data?.full_name ?? "Estudiante";
  const studentEmail = admissionRes.data?.email ?? "";

  // 5. Si passed → marcar section_progress (admin client bypasea RLS,
  //    así puede tocar progress del alumno).
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
      console.error(
        `[approve] section_progress upsert falló para ${sub.id}: ${spErr.message}`,
      );
      // No fail — al menos guardamos el feedback. Admin puede reintentar.
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

  // 8. Cerrar bucle: results_sent_at
  await admin
    .from("assignment_submissions")
    .update({ results_sent_at: nowIso })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    emailSent,
    passed: parsed.data.ai_passed,
  });
}
