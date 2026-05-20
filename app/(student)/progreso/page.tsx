import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, CheckCircle2, Clock, GraduationCap } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

import { DapStudentSidebar } from "@/components/layouts/dap-student-sidebar";
import { DapStudentTopbar } from "@/components/layouts/dap-student-topbar";

export const metadata = { title: "Mi Progreso — DAP" };

type ProfileRow = {
  full_name: string;
  avatar_url: string | null;
  matricula: string | null;
  program_start_date: string | null;
};

type ModuleProgressRow = {
  module_id: string;
  completed: boolean;
  completed_at: string | null;
};

type CertificateRow = {
  id: string;
  verification_code: string;
  issued_at: string;
  phase: { title: string; order_index: number } | null;
};

export default async function MiProgresoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/progreso");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, matricula, program_start_date")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (!profile) throw new Error("Perfil no encontrado");

  const { data: currentWeek } = await supabase.rpc("current_program_week", {
    p_user_id: user.id,
  });
  const currentWeekN = typeof currentWeek === "number" ? currentWeek : 0;

  const { data: progress } = await supabase
    .from("module_progress")
    .select("module_id, completed, completed_at")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .returns<ModuleProgressRow[]>();
  const completedCount = (progress ?? []).filter((p) => p.completed).length;
  const completionPct = Math.round((completedCount / 72) * 100);

  const { data: certificates } = await supabase
    .from("certificates")
    .select(
      "id, verification_code, issued_at, phase:phases(title, order_index)",
    )
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false })
    .returns<CertificateRow[]>();

  const { data: studentDims } = await supabase
    .from("student_dimensions")
    .select("dimension:dimensions(name, order_index), awarded_at")
    .eq("user_id", user.id)
    .returns<
      Array<{
        dimension: { name: string; order_index: number } | null;
        awarded_at: string;
      }>
    >();

  return (
    <div className="flex min-h-screen bg-surface-base text-text-primary">
      <DapStudentSidebar
        userName={profile.full_name}
        userAvatar={profile.avatar_url}
        onSignOut={signOutAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DapStudentTopbar title="Mi Progreso" />

        <main className="flex-1 overflow-y-auto px-6 py-10 sm:px-10">
          <div className="mx-auto max-w-5xl space-y-8">
            <header>
              <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
                Tu camino en el DAP
              </p>
              <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
                Mi Progreso
              </h1>
              {profile.matricula && (
                <p className="mt-2 font-mono text-xs text-text-tertiary">
                  Matrícula · {profile.matricula}
                </p>
              )}
            </header>

            {/* Progreso global */}
            <section className="rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
                    Progreso del programa
                  </p>
                  <p className="mt-1 font-grotesk text-h2 font-bold text-text-primary">
                    {completedCount}{" "}
                    <span className="text-text-secondary">de 72 módulos</span>
                  </p>
                </div>
                <p className="font-grotesk text-h1 font-bold text-brand-coral">
                  {completionPct}%
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-coral transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="mt-3 font-inter text-xs text-text-tertiary">
                Semana actual: {currentWeekN > 0 ? `${currentWeekN} de 72` : "Tu programa aún no inició"}
              </p>
            </section>

            {/* Dimensiones obtenidas */}
            <section className="rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <Award className="size-5 text-brand-coral" />
                <h2 className="font-grotesk text-h4 font-semibold">
                  Dimensiones obtenidas
                </h2>
              </div>
              {studentDims && studentDims.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {studentDims.map((d, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] p-4"
                    >
                      <p className="font-grotesk text-sm font-semibold text-foreground">
                        {d.dimension?.name ?? "—"}
                      </p>
                      <p className="mt-1 font-inter text-xs text-text-tertiary">
                        Otorgada el{" "}
                        {new Date(d.awarded_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">
                  Aún no has alcanzado ninguna dimensión. Completá los 8 módulos
                  de un bloque para recibir la primera (Discípulo).
                </p>
              )}
            </section>

            {/* Certificados */}
            <section className="rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <GraduationCap className="size-5 text-brand-coral" />
                <h2 className="font-grotesk text-h4 font-semibold">
                  Certificados emitidos
                </h2>
              </div>
              {certificates && certificates.length > 0 ? (
                <ul className="space-y-2">
                  {certificates.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3"
                    >
                      <div>
                        <p className="font-grotesk text-sm font-medium">
                          Bloque{" "}
                          {String(c.phase?.order_index ?? "?").padStart(2, "0")}
                          : {c.phase?.title ?? "—"}
                        </p>
                        <p className="font-inter text-xs text-text-tertiary">
                          Emitido el{" "}
                          {new Date(c.issued_at).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}{" "}
                          · Código: {c.verification_code}
                        </p>
                      </div>
                      <Link
                        href={`/verificar/${c.verification_code}`}
                        className="text-xs font-medium text-brand-coral hover:underline"
                      >
                        Ver
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">
                  Aún no tenés certificados emitidos. Se generan automáticamente
                  al completar cada bloque.
                </p>
              )}
            </section>

            {/* Últimos módulos completados */}
            <section className="rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="size-5 text-brand-coral" />
                <h2 className="font-grotesk text-h4 font-semibold">
                  Últimos módulos completados
                </h2>
              </div>
              {progress && progress.filter((p) => p.completed).length > 0 ? (
                <ul className="space-y-2 font-inter text-sm text-text-secondary">
                  {progress
                    .filter((p) => p.completed)
                    .slice(0, 10)
                    .map((p) => (
                      <li
                        key={p.module_id}
                        className="flex items-center justify-between border-b border-white/[0.04] pb-2"
                      >
                        <span className="text-foreground">
                          Módulo completado
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
                          <Clock className="size-3" />
                          {p.completed_at &&
                            new Date(p.completed_at).toLocaleDateString(
                              "es-MX",
                              { day: "numeric", month: "short" },
                            )}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">
                  Aún no completaste ningún módulo. Empezá por el módulo de tu
                  semana actual desde{" "}
                  <Link href="/dashboard" className="text-brand-coral hover:underline">
                    Inicio
                  </Link>
                  .
                </p>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
