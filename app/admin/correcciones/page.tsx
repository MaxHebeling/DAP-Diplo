import Link from "next/link";
import { Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CorrectionRow } from "./correction-row";

export const metadata = { title: "Correcciones · Admin DAP" };
export const dynamic = "force-dynamic";

type Pending = {
  id: string;
  user_id: string;
  module_id: string;
  content_text: string | null;
  attachment_url: string | null;
  submitted_at: string;
  corrected_at: string | null;
  ai_feedback: string | null;
  ai_score: number | null;
  ai_passed: boolean | null;
  status: string;
  revision_count: number | null;
  last_returned_at: string | null;
};

type ModuleMini = {
  id: string;
  title: string;
  slug: string;
  course_week: number | null;
  phase: { slug: string; title: string } | null;
};

type FilterKey = "all" | "first" | "resub" | "ia-pending" | "today" | "week";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "first", label: "1ª entrega" },
  { key: "resub", label: "Reentregas" },
  { key: "ia-pending", label: "IA pendiente" },
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
];

function matches(p: Pending, filter: FilterKey): boolean {
  const now = Date.now();
  const submittedAt = new Date(p.submitted_at).getTime();
  const revs = p.revision_count ?? 0;
  switch (filter) {
    case "first":
      return revs === 0;
    case "resub":
      return revs > 0;
    case "ia-pending":
      return !p.corrected_at;
    case "today": {
      // Hoy en zona horaria Argentina — usa formato es-AR fecha
      const fmt = (t: number) => new Intl.DateTimeFormat("es-AR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(t));
      return fmt(submittedAt) === fmt(now);
    }
    case "week":
      return now - submittedAt < 7 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

export default async function CorreccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = (FILTERS.find((f) => f.key === params.filter)?.key ?? "all") as FilterKey;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: pendingRaw } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, module_id, content_text, attachment_url, submitted_at, corrected_at, ai_feedback, ai_score, ai_passed, status, revision_count, last_returned_at",
    )
    .in("status", ["submitted", "completed", "incomplete"])
    .is("results_sent_at", null)
    .order("submitted_at", { ascending: false })
    .limit(200)
    .returns<Pending[]>();

  const allPending = pendingRaw ?? [];
  const pending = allPending.filter((p) => matches(p, filter));

  const moduleIds = Array.from(new Set(pending.map((p) => p.module_id)));
  const userIds = Array.from(new Set(pending.map((p) => p.user_id)));
  const [modulesRes, profilesRes] = await Promise.all([
    moduleIds.length > 0
      ? admin
          .from("modules")
          .select("id, title, slug, course_week, phase:phases(slug, title)")
          .in("id", moduleIds)
          .returns<ModuleMini[]>()
      : Promise.resolve({ data: [] as ModuleMini[] }),
    userIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const modulesById = new Map<string, ModuleMini>();
  for (const m of modulesRes.data ?? []) modulesById.set(m.id, m);
  const namesById = new Map<string, string>();
  for (const p of profilesRes.data ?? []) namesById.set(p.id, p.full_name);

  // Stats: contar por filtro (sobre allPending, no filtered)
  const counts = FILTERS.reduce<Record<FilterKey, number>>((acc, f) => {
    acc[f.key] = allPending.filter((p) => matches(p, f.key)).length;
    return acc;
  }, {} as Record<FilterKey, number>);

  const aprobados = pending.filter((p) => p.ai_passed).length;
  const reprobados = pending.filter((p) => p.corrected_at && !p.ai_passed).length;
  const oldestHours = computeOldestHours(
    pending[0]?.corrected_at ?? pending[0]?.submitted_at ?? null,
  );

  const { count: totalGraded } = await supabase
    .from("assignment_submissions")
    .select("id", { count: "exact", head: true })
    .not("results_sent_at", "is", null);

  return (
    <main className="px-6 py-8 lg:px-10">
      <header className="mb-8">
        <p className="mb-1 inline-flex items-center gap-1.5 font-inter text-xs font-medium uppercase tracking-[0.32em] text-brand-coral">
          <Sparkles className="size-3" /> Review IA
        </p>
        <h1 className="font-grotesk text-3xl font-bold text-foreground">
          Correcciones pendientes de aprobación
        </h1>
        <p className="mt-1 max-w-2xl font-inter text-sm text-muted-foreground">
          La IA generó el feedback en tu voz. Revisalo, editá si querés, y aprobá para que se envíe el email al alumno. Sin tu aprobación, el alumno no ve el resultado.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Pendientes filtradas" value={pending.length} accent="coral" icon={Clock} />
        <Kpi label="Sugeridas: aprobar" value={aprobados} accent="emerald" icon={CheckCircle2} />
        <Kpi label="Sugeridas: incomplete" value={reprobados} accent="amber" icon={AlertCircle} />
        <Kpi label="Ya enviadas (total)" value={totalGraded ?? 0} accent="violet" icon={CheckCircle2} />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key];
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/correcciones" : `/admin/correcciones?filter=${f.key}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-brand-violet bg-brand-violet/15 text-brand-violet"
                  : "border-border bg-card/50 text-muted-foreground hover:border-brand-violet/40 hover:text-foreground"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                active ? "bg-brand-violet/25 text-brand-violet" : "bg-muted text-muted-foreground"
              }`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
          <p className="font-grotesk text-lg font-semibold text-foreground">
            {filter === "all"
              ? "Sin correcciones pendientes 🎉"
              : "Nada en este filtro"}
          </p>
          <p className="mt-2 font-inter text-sm text-muted-foreground">
            {filter === "all"
              ? "Cuando la IA termine de procesar una entrega nueva, va a aparecer acá."
              : "Probá con otro filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {oldestHours > 12 && filter === "all" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm text-amber-400">
              ⏰ La más vieja lleva <strong>{oldestHours} horas</strong> esperando review.
            </div>
          )}
          {pending.map((sub) => {
            const m = modulesById.get(sub.module_id);
            return (
              <CorrectionRow
                key={sub.id}
                submission={sub}
                studentName={namesById.get(sub.user_id) ?? "Alumno"}
                module={
                  m
                    ? {
                        title: m.title,
                        slug: m.slug,
                        courseWeek: m.course_week,
                        phaseTitle: m.phase?.title ?? "",
                        phaseSlug: m.phase?.slug ?? "",
                      }
                    : null
                }
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

function computeOldestHours(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function Kpi({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent: "violet" | "coral" | "emerald" | "amber";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const cls =
    accent === "violet"
      ? "border-brand-violet/30 bg-brand-violet/[0.06] text-brand-violet"
      : accent === "coral"
        ? "border-brand-coral/30 bg-brand-coral/[0.06] text-brand-coral"
        : accent === "emerald"
          ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-500"
          : "border-amber-500/30 bg-amber-500/[0.06] text-amber-500";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center gap-2 opacity-80">
        <Icon className="size-3.5" />
        <p className="font-inter text-xs uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-1 font-grotesk text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}
