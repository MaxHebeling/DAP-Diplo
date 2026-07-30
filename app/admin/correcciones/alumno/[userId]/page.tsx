import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, FileText, RotateCcw, Sparkles, AlertCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Expediente alumno · Admin DAP" };
export const dynamic = "force-dynamic";

type Submission = {
  id: string;
  module_id: string;
  status: string;
  submitted_at: string | null;
  corrected_at: string | null;
  ai_score: number | null;
  ai_passed: boolean | null;
  revision_count: number | null;
  last_returned_at: string | null;
  results_sent_at: string | null;
  content_text: string | null;
  attachment_url: string | null;
  opens_at: string | null;
  closes_at: string | null;
};

type ModuleMini = {
  id: string;
  title: string;
  slug: string;
  course_week: number | null;
  block_id: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default async function StudentDossierPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { admin: isAdmin } = await requireAdmin();
  if (!isAdmin) redirect("/dashboard");
  const { userId } = await params;

  const service = createAdminClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, full_name, program_start_date, church_id, admission_status")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) notFound();

  const [{ data: au }, { data: church }] = await Promise.all([
    service.auth.admin.getUserById(userId),
    profile.church_id
      ? service.from("churches").select("name, country").eq("id", profile.church_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const email = au?.user?.email ?? "?";

  // Todas las submissions del alumno
  const { data: subsRaw } = await service
    .from("assignment_submissions")
    .select(
      "id, module_id, status, submitted_at, corrected_at, ai_score, ai_passed, revision_count, last_returned_at, results_sent_at, content_text, attachment_url, opens_at, closes_at",
    )
    .eq("user_id", userId)
    .returns<Submission[]>();
  const subs = subsRaw ?? [];

  const moduleIds = Array.from(new Set(subs.map((s) => s.module_id)));
  const { data: modulesRaw } = moduleIds.length > 0
    ? await service.from("modules").select("id, title, slug, course_week, block_id").in("id", moduleIds).returns<ModuleMini[]>()
    : { data: [] };
  const modulesById = new Map<string, ModuleMini>((modulesRaw ?? []).map((m) => [m.id, m]));

  const blockIds = Array.from(new Set((modulesRaw ?? []).map((m) => m.block_id).filter(Boolean)));
  const { data: blocksRaw } = blockIds.length > 0
    ? await service.from("blocks").select("id, slug").in("id", blockIds)
    : { data: [] };
  const blockSlugById = new Map<string, string>((blocksRaw ?? []).map((b) => [b.id, b.slug]));

  // Ordenar por course_week ascendente
  const sortedSubs = [...subs].sort((a, b) => {
    const wa = modulesById.get(a.module_id)?.course_week ?? 999;
    const wb = modulesById.get(b.module_id)?.course_week ?? 999;
    return wa - wb;
  });

  // KPIs
  const total = subs.length;
  const entregadas = subs.filter((s) => !!s.submitted_at).length;
  const pendientes = subs.filter((s) => !!s.submitted_at && !s.corrected_at).length;
  const aprobadas = subs.filter((s) => s.ai_passed === true).length;
  const devueltas = subs.filter((s) => (s.revision_count ?? 0) > 0).length;
  const scoredCount = subs.filter((s) => typeof s.ai_score === "number").length;
  const promedio = scoredCount > 0
    ? Math.round(subs.reduce((sum, s) => sum + (s.ai_score ?? 0), 0) / scoredCount)
    : null;
  const ultimaEntrega = subs
    .map((s) => s.submitted_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop() ?? null;
  const ultimaCorreccion = subs
    .map((s) => s.corrected_at)
    .filter((d): d is string => !!d)
    .sort()
    .pop() ?? null;

  const firstName = profile.full_name.split(" ")[0];

  return (
    <main className="px-6 py-8 lg:px-10">
      <Link
        href="/admin/correcciones"
        className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Volver a correcciones
      </Link>

      <header className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-coral">Expediente académico</p>
        <h1 className="font-grotesk text-3xl font-bold">{profile.full_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {email} · {church?.name ?? "sin iglesia"} {church?.country ? `(${church.country})` : ""} · Program start: {profile.program_start_date ?? "—"}
        </p>
      </header>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Kpi label="Tareas totales" value={total} tone="neutral" />
        <Kpi label="Entregadas" value={entregadas} tone="violet" />
        <Kpi label="Pendientes" value={pendientes} tone="coral" />
        <Kpi label="Aprobadas" value={aprobadas} tone="emerald" />
        <Kpi label="Devueltas" value={devueltas} tone="amber" />
        <Kpi label="Promedio" value={promedio !== null ? `${promedio}/100` : "—"} tone={promedio !== null && promedio >= 70 ? "emerald" : "neutral"} />
      </div>

      {/* Actividad reciente */}
      <div className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Última entrega</p>
          <p className="mt-1 font-mono text-sm">{formatDate(ultimaEntrega)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Última corrección</p>
          <p className="mt-1 font-mono text-sm">{formatDate(ultimaCorreccion)}</p>
        </div>
      </div>

      {/* Tabla de tareas */}
      <div>
        <h2 className="mb-3 font-grotesk text-lg font-semibold">Todas las tareas ({total})</h2>
        {sortedSubs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center text-sm text-muted-foreground">
            {firstName} todavía no tiene tareas asignadas.
          </div>
        ) : (
          <div className="space-y-2">
            {sortedSubs.map((s) => {
              const m = modulesById.get(s.module_id);
              const blockSlug = m ? blockSlugById.get(m.block_id) : null;
              const state = deriveState(s);
              const daysToCorrect = daysBetween(s.submitted_at, s.corrected_at);
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card/60 p-4 transition hover:border-brand-violet/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StateBadge state={state} />
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Sem {m?.course_week ?? "?"}
                        </span>
                        <span className="font-grotesk text-sm font-semibold">
                          {m?.title ?? "módulo desconocido"}
                        </span>
                        {(s.revision_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/[0.1] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
                            <RotateCcw className="size-2.5" /> {s.revision_count} devolución{s.revision_count === 1 ? "" : "es"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Entrega: <span className="font-mono">{formatDate(s.submitted_at)}</span></span>
                        <span>Corrección: <span className="font-mono">{formatDate(s.corrected_at)}</span></span>
                        {daysToCorrect !== null && <span>Δ {daysToCorrect} día{daysToCorrect === 1 ? "" : "s"}</span>}
                        {typeof s.ai_score === "number" && (
                          <span className="font-semibold">Score: <span className={s.ai_passed ? "text-emerald-400" : "text-amber-400"}>{s.ai_score}/100</span></span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {blockSlug && m?.slug && (
                        <Link
                          href={`/fases/${blockSlug}/modulos/${m.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-brand-coral/40 hover:text-brand-coral"
                        >
                          Módulo
                        </Link>
                      )}
                      <Link
                        href={`/admin/correcciones/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-brand-violet/30 bg-brand-violet/[0.08] px-3 py-1.5 text-xs font-semibold text-brand-violet hover:bg-brand-violet/[0.15]"
                      >
                        Ver corrección <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

type State =
  | "not_delivered"
  | "pending_review"
  | "approved"
  | "returned"
  | "resubmitted"
  | "incomplete";

function deriveState(s: Submission): State {
  if (!s.submitted_at) return "not_delivered";
  if (s.ai_passed === true) return "approved";
  if ((s.revision_count ?? 0) > 0 && s.last_returned_at && (!s.submitted_at || new Date(s.last_returned_at) > new Date(s.submitted_at))) return "returned";
  if ((s.revision_count ?? 0) > 0) return "resubmitted";
  if (!s.corrected_at) return "pending_review";
  return "incomplete";
}

function StateBadge({ state }: { state: State }) {
  const config: Record<State, { label: string; icon: React.ReactNode; cls: string }> = {
    not_delivered: { label: "No entregada", icon: <Clock className="size-3" />, cls: "border-white/[0.1] bg-white/[0.03] text-muted-foreground" },
    pending_review: { label: "Pendiente revisión", icon: <Sparkles className="size-3" />, cls: "border-brand-coral/40 bg-brand-coral/[0.1] text-brand-coral" },
    approved: { label: "Aprobada", icon: <CheckCircle2 className="size-3" />, cls: "border-emerald-500/40 bg-emerald-500/[0.1] text-emerald-400" },
    returned: { label: "Devuelta al alumno", icon: <RotateCcw className="size-3" />, cls: "border-amber-500/40 bg-amber-500/[0.1] text-amber-400" },
    resubmitted: { label: "Reenviada", icon: <FileText className="size-3" />, cls: "border-brand-violet/40 bg-brand-violet/[0.1] text-brand-violet" },
    incomplete: { label: "Incompleta", icon: <AlertCircle className="size-3" />, cls: "border-red-500/40 bg-red-500/[0.1] text-red-400" },
  };
  const c = config[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number | string; tone: "neutral" | "violet" | "coral" | "emerald" | "amber" }) {
  const cls =
    tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400"
    : tone === "amber" ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-400"
    : tone === "coral" ? "border-brand-coral/30 bg-brand-coral/[0.06] text-brand-coral"
    : tone === "violet" ? "border-brand-violet/30 bg-brand-violet/[0.06] text-brand-violet"
    : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-0.5 font-grotesk text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
