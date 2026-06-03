import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { correctAssignment } from "@/lib/excorrector";
import { MS_PER_HOUR } from "@/lib/constants/time";

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
  const cutoffIso = new Date(Date.now() - DELAY_HOURS * MS_PER_HOUR).toISOString();

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

  // Pre-fetch en bulk todas las dimensiones que iban antes 1 query × submission
  // (modules, module_sections, profiles, admissions). Bajamos de 4N a 4
  // round-trips fijos por corrida del cron.
  const moduleIds = Array.from(new Set(pending.map((p) => p.module_id)));
  const sectionIds = Array.from(
    new Set(pending.map((p) => p.module_section_id)),
  );
  const [modulesRes, sectionsRes] = await Promise.all([
    admin
      .from("modules")
      .select(
        "id, title, slug, objective, main_revelation, block:blocks(slug)",
      )
      .in("id", moduleIds)
      .returns<ModuleInfo[]>(),
    admin
      .from("module_sections")
      .select("id, body_md")
      .in("id", sectionIds)
      .returns<SectionInfo[]>(),
  ]);

  const modulesById = new Map<string, ModuleInfo>();
  for (const m of modulesRes.data ?? []) {
    modulesById.set(m.id, m);
  }
  const sectionsById = new Map<string, SectionInfo>();
  for (const s of sectionsRes.data ?? []) {
    sectionsById.set(s.id, s);
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const sub of pending) {
    try {
      // 1. Marcar en proceso
      await admin
        .from("assignment_submissions")
        .update({ status: "correcting", updated_at: new Date().toISOString() })
        .eq("id", sub.id);

      // 2. Lookup en los maps pre-cargados
      const mod = modulesById.get(sub.module_id);
      const sec = sectionsById.get(sub.module_section_id);

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

      // 4. Persistir feedback IA — pero NO envía email todavía.
      //    Decisión jun-2026: review obligatorio del admin antes de
      //    soltar el feedback al alumno. El cron solo genera + deja
      //    en cola; admin aprueba desde /admin/correcciones.
      //    section_progress + email + push se disparan en /api/admin/correcciones/[id]/approve.
      const nowIso = new Date().toISOString();
      const { error: updErr } = await admin
        .from("assignment_submissions")
        .update({
          status: finalStatus,
          ai_feedback: feedback_markdown,
          ai_score: score,
          ai_passed: passed,
          corrected_at: nowIso,
          // results_sent_at SIGUE null. Lo setea /api/admin/correcciones/[id]/approve.
          updated_at: nowIso,
        })
        .eq("id", sub.id);
      if (updErr) throw new Error(`update: ${updErr.message}`);

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
