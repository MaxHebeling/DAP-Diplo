"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type ActionResult =
  | { ok: true; moduleCompleted?: boolean; blockCompleted?: boolean }
  | { ok: false; error: string };

const sectionKinds = [
  "intro",
  "teaching",
  "activation",
  "evaluation",
  "impartation",
] as const;

const markCompletedSchema = z.object({
  sectionId: z.uuid(),
  moduleId: z.uuid(),
  phaseSlug: z.string(),
  moduleSlug: z.string(),
  // Si se pasa, navega ahí tras marcar; si no, ahí mismo.
  next: z.enum(sectionKinds).nullable().optional(),
});

/**
 * Marca una sección como completada y opcionalmente navega a la
 * siguiente. Si las 5 secciones del módulo están completed → marca
 * el módulo como completado también.
 */
export async function markSectionCompleted(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = markCompletedSchema.safeParse({
    sectionId: formData.get("sectionId"),
    moduleId: formData.get("moduleId"),
    phaseSlug: formData.get("phaseSlug"),
    moduleSlug: formData.get("moduleSlug"),
    next: formData.get("next") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Parámetros inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  // 0) Defense-in-depth: el módulo debe estar abierto para este alumno.
  //    has_access_to_module verifica suscripción + course_week <=
  //    current_program_week + admin override. Sin este check, alguien
  //    podría llamar la action vía fetch antes del 23-jun-2026 y marcar
  //    progreso fantasma.
  const { data: hasAccess } = await supabase.rpc("has_access_to_module", {
    p_module_id: parsed.data.moduleId,
  });
  if (!hasAccess) {
    return { ok: false, error: "Este módulo aún no está disponible." };
  }

  // 1) Upsert section_progress completed = true
  const { error: sErr } = await supabase.from("section_progress").upsert(
    {
      user_id: user.id,
      module_section_id: parsed.data.sectionId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_section_id", ignoreDuplicates: false },
  );
  if (sErr) return { ok: false, error: sErr.message };

  // 2) ¿Las 5 secciones del módulo están ya completadas?
  const { data: sectionRows, error: countErr } = await supabase
    .from("module_sections")
    .select("id, section_progress(completed)")
    .eq("module_id", parsed.data.moduleId);
  if (countErr) return { ok: false, error: countErr.message };

  const allDone =
    (sectionRows?.length ?? 0) === 5 &&
    (sectionRows ?? []).every(
      (s) =>
        Array.isArray(s.section_progress) &&
        s.section_progress.some(
          (p: { completed: boolean | null }) => p.completed === true,
        ),
    );

  let moduleCompleted = false;
  let blockCompleted = false;

  if (allDone) {
    const { error: mErr } = await supabase.from("module_progress").upsert(
      {
        user_id: user.id,
        module_id: parsed.data.moduleId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,module_id", ignoreDuplicates: false },
    );
    if (mErr) return { ok: false, error: mErr.message };
    moduleCompleted = true;

    // ¿Todos los módulos de la fase completados?
    const { data: modRow } = await supabase
      .from("modules")
      .select("phase_id")
      .eq("id", parsed.data.moduleId)
      .maybeSingle();
    if (modRow?.phase_id) {
      const [{ count: totalModules }, { count: completedModules }] =
        await Promise.all([
          supabase
            .from("modules")
            .select("id", { count: "exact", head: true })
            .eq("phase_id", modRow.phase_id),
          supabase
            .from("module_progress")
            .select(
              "module:modules!inner(phase_id)",
              { count: "exact", head: true },
            )
            .eq("user_id", user.id)
            .eq("completed", true)
            .eq("module.phase_id", modRow.phase_id),
        ]);
      if (
        totalModules !== null &&
        completedModules !== null &&
        completedModules >= totalModules
      ) {
        blockCompleted = true;
      }
    }
  }

  revalidatePath(
    `/fases/${parsed.data.phaseSlug}/modulos/${parsed.data.moduleSlug}`,
  );

  if (parsed.data.next) {
    const toastParam = blockCompleted
      ? "?toast=phase-completed"
      : moduleCompleted
        ? "?toast=module-completed"
        : "";
    redirect(
      `/fases/${parsed.data.phaseSlug}/modulos/${parsed.data.moduleSlug}?section=${parsed.data.next}${toastParam.replace("?", "&")}`,
    );
  }

  return { ok: true, moduleCompleted, blockCompleted };
}

// --- Position saving (Mux teaching section) -------------------------

const savePositionSchema = z.object({
  sectionId: z.uuid(),
  lastPositionSeconds: z.number().int().min(0),
  watchedSeconds: z.number().int().min(0).optional(),
});

/**
 * Guarda last_position_seconds del video. Se llama cada 10s desde el
 * Mux player (Client Component). Sin redirect — solo persiste.
 */
export async function saveLastPosition(
  input: z.infer<typeof savePositionSchema>,
): Promise<{ ok: boolean }> {
  const parsed = savePositionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const payload: {
    user_id: string;
    module_section_id: string;
    last_position_seconds: number;
    watched_seconds?: number;
    updated_at: string;
  } = {
    user_id: user.id,
    module_section_id: parsed.data.sectionId,
    last_position_seconds: parsed.data.lastPositionSeconds,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.watchedSeconds !== undefined) {
    payload.watched_seconds = parsed.data.watchedSeconds;
  }

  const { error } = await supabase
    .from("section_progress")
    .upsert(payload, {
      onConflict: "user_id,module_section_id",
      ignoreDuplicates: false,
    });
  return { ok: !error };
}
