import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { issueCertificatePdf } from "@/lib/certificates/issue";

type CascadeInput = {
  supabase: SupabaseClient;
  userId: string;
  moduleSectionId: string;
  moduleId: string;
  phaseId: string;
  phaseSlug: string;
  moduleSlug: string;
};

export type CascadeResult = {
  moduleCompleted: boolean;
  blockCompletion: Record<string, unknown> | null;
};

/**
 * Cascada que se dispara cuando un alumno aprueba la evaluación de un
 * módulo:
 *   1. UPSERT section_progress(evaluation).completed = true
 *   2. Si las 5 secciones del módulo están completed → module_progress
 *   3. RPC complete_phase_if_done — si la fase entera quedó completa,
 *      otorga rango + crea certificate. Si certificate_id viene,
 *      generamos el PDF y lo subimos.
 *
 * Diseñada para correr tanto desde el endpoint de submit (cuando no
 * hay 48h gate) como desde el endpoint de reveal (cuando se cumplen
 * las 48h y se descubre que aprobó).
 *
 * Idempotente: section_progress y module_progress usan upsert con
 * onConflict; complete_phase_if_done es idempotente; issueCertificatePdf
 * sobrescribe el path si ya existe (upsert=true en storage).
 */
export async function runQuizPassedCascade(
  input: CascadeInput,
): Promise<CascadeResult> {
  const {
    supabase,
    userId,
    moduleSectionId,
    moduleId,
    phaseId,
    phaseSlug,
    moduleSlug,
  } = input;

  let moduleCompleted = false;
  let blockCompletion: Record<string, unknown> | null = null;

  // 1. Mark evaluation section completed
  const { error: spErr } = await supabase.from("section_progress").upsert(
    {
      user_id: userId,
      module_section_id: moduleSectionId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_section_id" },
  );
  if (spErr) {
    console.error(
      `[quiz.cascade] section_progress upsert failed: ${spErr.message}`,
    );
  }

  // 2. ¿Las 5 secciones están completed?
  const { data: sectionRows } = await supabase
    .from("module_sections")
    .select("id, section_progress(completed)")
    .eq("module_id", moduleId);

  const allDone =
    (sectionRows?.length ?? 0) === 5 &&
    (sectionRows ?? []).every(
      (s: { section_progress: { completed: boolean | null }[] | null }) =>
        Array.isArray(s.section_progress) &&
        s.section_progress.some((p) => p.completed === true),
    );

  if (!allDone) {
    revalidatePath(`/fases/${phaseSlug}/modulos/${moduleSlug}`);
    revalidatePath(`/dashboard`);
    return { moduleCompleted: false, blockCompletion: null };
  }

  const { error: mpErr } = await supabase.from("module_progress").upsert(
    {
      user_id: userId,
      module_id: moduleId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_id" },
  );
  if (mpErr) {
    console.error(
      `[quiz.cascade] module_progress upsert failed: ${mpErr.message}`,
    );
  } else {
    moduleCompleted = true;
  }

  // 3. ¿Fase completa? → rango + certificate
  const { data: blockResult, error: cbErr } = await supabase.rpc(
    "complete_phase_if_done",
    { p_user_id: userId, p_phase_id: phaseId },
  );
  if (cbErr) {
    console.error(
      `[quiz.cascade] complete_phase_if_done failed: ${cbErr.message}`,
    );
  } else if (
    blockResult &&
    typeof blockResult === "object" &&
    !Array.isArray(blockResult)
  ) {
    blockCompletion = blockResult as Record<string, unknown>;
    if (blockCompletion.newly_completed === true) {
      const certId = blockCompletion.certificate_id as string | undefined;
      if (certId) {
        try {
          const { path } = await issueCertificatePdf(certId);
          blockCompletion.pdf_path = path;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[quiz.cascade] issueCertificatePdf failed: ${msg}`,
          );
          blockCompletion.pdf_error = msg;
        }
      }
    }
  }

  revalidatePath(`/fases/${phaseSlug}/modulos/${moduleSlug}`);
  revalidatePath(`/fases/${phaseSlug}`);
  revalidatePath(`/dashboard`);

  return { moduleCompleted, blockCompletion };
}
