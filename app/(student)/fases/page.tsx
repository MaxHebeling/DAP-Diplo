import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

import { DapStudentSidebar } from "@/components/layouts/dap-student-sidebar";
import { DapStudentTopbar } from "@/components/layouts/dap-student-topbar";

export const metadata = { title: "Mis Módulos — DAP" };

type ProfileRow = {
  full_name: string;
  avatar_url: string | null;
  program_start_date: string | null;
};

type PhaseRow = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  brand_name: string | null;
  promise: string | null;
  subtitle: string | null;
  dimension: { name: string; order_index: number } | null;
};

type BlockModulesRow = {
  block_id: string;
  course_week: number;
  id: string;
};

type ProgressRow = {
  module_id: string;
  completed: boolean;
};

export default async function MisModulosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/fases");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, program_start_date")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (!profile) throw new Error("Perfil no encontrado");

  // 9 bloques (phases) ordenados
  const { data: phases } = await supabase
    .from("phases")
    .select(
      "id, order_index, slug, title, brand_name, promise, subtitle, dimension:dimensions(name, order_index)",
    )
    .order("order_index", { ascending: true })
    .returns<PhaseRow[]>();

  // Todos los módulos con su block + course_week
  const { data: allModules } = await supabase
    .from("modules")
    .select("id, block_id, course_week")
    .order("course_week", { ascending: true })
    .returns<BlockModulesRow[]>();

  // Progreso del alumno
  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, completed")
    .eq("user_id", user.id)
    .returns<ProgressRow[]>();
  const completedByModuleId = new Map<string, boolean>(
    (progressRows ?? []).map((p) => [p.module_id, p.completed]),
  );

  // current_program_week
  const { data: currentWeek } = await supabase.rpc("current_program_week", {
    p_user_id: user.id,
  });
  const currentWeekN = typeof currentWeek === "number" ? currentWeek : 0;

  // Agrupar módulos por block_id
  // phases.id !== blocks.id (existen 2 sets — el FK real es modules.block_id → blocks)
  // pero phases.slug === blocks.slug. Resolvemos por slug. Cargamos blocks
  // para hacer ese mapeo.
  const { data: blocks } = await supabase
    .from("blocks")
    .select("id, slug")
    .returns<{ id: string; slug: string }[]>();
  const blockIdBySlug = new Map<string, string>(
    (blocks ?? []).map((b) => [b.slug, b.id]),
  );

  const modulesByBlockId = new Map<string, BlockModulesRow[]>();
  for (const m of allModules ?? []) {
    if (!modulesByBlockId.has(m.block_id)) {
      modulesByBlockId.set(m.block_id, []);
    }
    modulesByBlockId.get(m.block_id)!.push(m);
  }

  return (
    <div className="flex min-h-screen bg-surface-base text-text-primary">
      <DapStudentSidebar
        userName={profile.full_name}
        userAvatar={profile.avatar_url}
        onSignOut={signOutAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DapStudentTopbar title="Mis Módulos" />

        <main className="flex-1 overflow-y-auto px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-6xl space-y-8">
            <header>
              <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                Diplomado Apostólico Pastoral · 72 semanas
              </p>
              <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
                Los 9 Bloques
              </h1>
              <p className="mt-3 font-inter text-base text-text-secondary">
                Tu camino completo. Cada bloque entrega una dimensión nueva.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(phases ?? []).map((phase) => {
                const blockId = blockIdBySlug.get(phase.slug);
                const modules = blockId
                  ? (modulesByBlockId.get(blockId) ?? [])
                  : [];
                const completed = modules.filter(
                  (m) => completedByModuleId.get(m.id) === true,
                ).length;
                const total = modules.length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                // ¿Tiene algún módulo en la semana actual o pasada?
                const firstWeek = modules[0]?.course_week ?? 999;
                const lastWeek = modules[modules.length - 1]?.course_week ?? 0;
                const isLocked = currentWeekN > 0 && firstWeek > currentWeekN;
                const isCompleted = completed === total && total > 0;

                const dimN = String(
                  phase.dimension?.order_index ?? phase.order_index,
                ).padStart(2, "0");
                const dimName = phase.dimension?.name ?? "—";
                const heroTitle = phase.brand_name ?? phase.title;

                return (
                  <Link
                    key={phase.id}
                    href={`/fases/${phase.slug}`}
                    className="group relative flex flex-col rounded-xl border border-white/[0.06] bg-surface-elevated/60 p-6 transition-all hover:-translate-y-0.5 hover:border-brand-violet/30 hover:bg-surface-elevated"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-coral">
                        Dimensión {dimN} · {dimName}
                      </p>
                      {isCompleted ? (
                        <CheckCircle2 className="size-5 text-emerald-400" />
                      ) : isLocked ? (
                        <Lock className="size-5 text-text-tertiary" />
                      ) : null}
                    </div>

                    <h3 className="font-grotesk text-h3 font-bold gradient-text leading-tight">
                      {heroTitle}
                    </h3>
                    {phase.subtitle && (
                      <p className="mt-1 font-inter text-sm text-text-secondary">
                        {phase.subtitle}
                      </p>
                    )}
                    {phase.promise && (
                      <p className="mt-3 font-inter text-sm italic leading-relaxed text-text-primary/85">
                        {phase.promise}
                      </p>
                    )}

                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between font-inter text-xs text-text-tertiary">
                        <span>
                          {completed} / {total} módulos
                        </span>
                        <span className="text-brand-coral">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-coral transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="font-inter text-xs text-text-tertiary">
                        Bloque {String(phase.order_index).padStart(2, "0")} · Semanas {firstWeek}–{lastWeek}
                      </p>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-1.5 font-inter text-sm font-medium text-brand-coral transition-all group-hover:gap-2">
                      Ver bloque
                      <ArrowRight className="size-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

