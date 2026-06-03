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
};

type ModuleMini = {
  id: string;
  title: string;
  slug: string;
  course_week: number | null;
  phase: { slug: string; title: string } | null;
};

export default async function CorreccionesPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Pendientes de review: status completed/incomplete + ai_feedback != null
  // + results_sent_at IS NULL (cron generó, admin aún no aprobó).
  const { data: pendingRaw } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, module_id, content_text, attachment_url, submitted_at, corrected_at, ai_feedback, ai_score, ai_passed, status",
    )
    .in("status", ["completed", "incomplete"])
    .not("ai_feedback", "is", null)
    .is("results_sent_at", null)
    .order("corrected_at", { ascending: true })
    .limit(50)
    .returns<Pending[]>();

  const pending = pendingRaw ?? [];

  // Enriquecimiento batch: módulos + nombres alumnos
  const moduleIds = Array.from(new Set(pending.map((p) => p.module_id)));
  const userIds = Array.from(new Set(pending.map((p) => p.user_id)));
  const [modulesRes, profilesRes] = await Promise.all([
    moduleIds.length > 0
      ? admin
          .from("modules")
          .select(
            "id, title, slug, course_week, phase:phases(slug, title)",
          )
          .in("id", moduleIds)
          .returns<ModuleMini[]>()
      : Promise.resolve({ data: [] as ModuleMini[] }),
    userIds.length > 0
      ? admin
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const modulesById = new Map<string, ModuleMini>();
  for (const m of modulesRes.data ?? []) modulesById.set(m.id, m);
  const namesById = new Map<string, string>();
  for (const p of profilesRes.data ?? []) namesById.set(p.id, p.full_name);

  // Stats agregadas para los KPIs
  const aprobados = pending.filter((p) => p.ai_passed).length;
  const reprobados = pending.length - aprobados;
  const oldestHours = computeOldestHours(
    pending[0]?.corrected_at ?? pending[0]?.submitted_at ?? null,
  );

  // Para volumen total (incluso ya aprobadas) — referencia
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

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Pendientes" value={pending.length} accent="coral" icon={Clock} />
        <Kpi label="Sugeridas: aprobar" value={aprobados} accent="emerald" icon={CheckCircle2} />
        <Kpi label="Sugeridas: incomplete" value={reprobados} accent="amber" icon={AlertCircle} />
        <Kpi label="Ya enviadas" value={totalGraded ?? 0} accent="violet" icon={CheckCircle2} />
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
          <p className="font-grotesk text-lg font-semibold text-foreground">
            Sin correcciones pendientes 🎉
          </p>
          <p className="mt-2 font-inter text-sm text-muted-foreground">
            Cuando la IA termine de procesar una entrega nueva, va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {oldestHours > 12 && (
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

// Fuera del componente para que el lint react-hooks/purity no se queje
// del Date.now() (es server component, no hay re-render, pero el rule
// no diferencia).
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
      <p className="mt-1 font-grotesk text-3xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
