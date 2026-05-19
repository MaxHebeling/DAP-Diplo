import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PauseBanner } from "@/components/student/pause-banner";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mi dashboard — DAP" };

type ProfileRow = {
  full_name: string;
  ministry_name: string | null;
  country: string | null;
  role: "student" | "admin";
};

type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  months_paid_total: number;
  current_month_number: number;
  paused_at: string | null;
  pause_reason: string | null;
  extension_count: number;
  stripe_subscription_id: string | null;
};

type ModuleListItem = {
  id: string;
  slug: string;
  order_index: number;
  title: string;
  subtitle: string | null;
  approved: boolean;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  // Profile
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("full_name, ministry_name, country, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (profErr) throw new Error(`No se pudo cargar perfil: ${profErr.message}`);
  if (!profile) throw new Error("Tu perfil no existe en la base de datos.");

  const firstName = profile.full_name.split(" ")[0];

  // Latest subscription (puede no existir, estar canceled, etc.)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      `id, status, current_period_end, cancel_at_period_end, cancel_at,
       months_paid_total, current_month_number, paused_at, pause_reason,
       extension_count, stripe_subscription_id`,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  const hasActive =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    (sub.current_period_end === null ||
      new Date(sub.current_period_end) > new Date());

  const isPaused = hasActive && !!sub?.paused_at;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <nav className="mb-10 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            {profile.role === "admin" && (
              <Button variant="outline" size="sm" render={<Link href="/admin" />}>
                Admin
              </Button>
            )}
            <SignOutButton variant="ghost" />
          </div>
        </nav>

        {/* ============= ESTADO 1: SIN suscripción activa ============= */}
        {!hasActive && (
          <NoSubscriptionState
            firstName={firstName}
            hadCanceledSub={!!sub && sub.status === "canceled"}
          />
        )}

        {/* ============= ESTADO 2 + 3: con sub activa ============= */}
        {hasActive && sub && (
          <ActiveSubscriptionDashboard
            firstName={firstName}
            ministryName={profile.ministry_name}
            country={profile.country}
            isAdmin={profile.role === "admin"}
            sub={sub}
            isPaused={isPaused}
            userId={user.id}
            cancelDate={
              sub.cancel_at_period_end || sub.cancel_at
                ? formatDate(sub.cancel_at ?? sub.current_period_end)
                : null
            }
            nextBillDate={formatDate(sub.current_period_end)}
          />
        )}
      </div>
    </main>
  );
}

// =====================================================================
// ESTADO 1
// =====================================================================
function NoSubscriptionState({
  firstName,
  hadCanceledSub,
}: {
  firstName: string;
  hadCanceledSub: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-card p-10">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
        Diplomado Apostólico Pastoral
      </p>
      <h1 className="mb-4 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
        Hola, {firstName}.{" "}
        {hadCanceledSub
          ? "Reactiva tu diplomado cuando estés listo."
          : "Comienza tu formación apostólica."}
      </h1>
      <p className="mb-8 max-w-2xl text-base text-muted-foreground">
        {hadCanceledSub
          ? "Tu suscripción está cancelada pero conservamos todo tu progreso: módulos aprobados, dimensiones alcanzadas y certificados. Cuando reactives retomas donde lo dejaste."
          : "18 meses de formación con 200 módulos. Cada mes desbloqueas nuevos módulos si completas los actuales. $25 USD/mes, cancela cuando quieras."}
      </p>
      <Button size="default" render={<Link href="/suscribirme" />}>
        {hadCanceledSub ? "Reactivar suscripción" : "Suscribirme — $25/mes"}
        <ArrowRight className="size-4" />
      </Button>
    </section>
  );
}

// =====================================================================
// ESTADOS 2 + 3
// =====================================================================
async function ActiveSubscriptionDashboard({
  firstName,
  ministryName,
  country,
  isAdmin,
  sub,
  isPaused,
  userId,
  cancelDate,
  nextBillDate,
}: {
  firstName: string;
  ministryName: string | null;
  country: string | null;
  isAdmin: boolean;
  sub: SubscriptionRow;
  isPaused: boolean;
  userId: string;
  cancelDate: string | null;
  nextBillDate: string | null;
}) {
  const supabase = await createClient();
  const month = sub.current_month_number;

  // Módulos del mes actual + estado aprobado por módulo (vía
  // module_progress.completed cacheado, equivalente a is_module_approved).
  const { data: monthModules } = await supabase
    .from("modules")
    .select("id, slug, order_index, title, subtitle, phase_id")
    .eq("course_month", month)
    .order("order_index");

  const { data: progressRows } = await supabase
    .from("module_progress")
    .select("module_id, completed")
    .eq("user_id", userId)
    .eq("completed", true)
    .in("module_id", (monthModules ?? []).map((m) => m.id));

  const approvedSet = new Set((progressRows ?? []).map((p) => p.module_id));

  const modules: ModuleListItem[] = (monthModules ?? []).map((m) => ({
    id: m.id,
    slug: m.slug,
    order_index: m.order_index,
    title: m.title,
    subtitle: m.subtitle,
    approved: approvedSet.has(m.id),
  }));

  const approvedCount = modules.filter((m) => m.approved).length;
  const totalCount = modules.length;
  const firstPending = modules.find((m) => !m.approved);

  // Fase del mes actual
  const phaseId = monthModules?.[0]?.phase_id;
  const { data: phaseRow } = phaseId
    ? await supabase
        .from("phases")
        .select("id, order_index, title, slug")
        .eq("id", phaseId)
        .maybeSingle()
    : { data: null };

  // days_paused via RPC (también funciona si paused_at es null → devuelve 0)
  const { data: daysPaused } = await supabase.rpc("days_paused", {
    p_user_id: userId,
  });
  const days = typeof daysPaused === "number" ? daysPaused : 0;

  // ¿Tiene extensión activa para la FASE del mes actual?
  let hasExtensionForPhase = false;
  if (phaseId) {
    const { count } = await supabase
      .from("pause_extensions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("phase_id", phaseId);
    hasExtensionForPhase = (count ?? 0) > 0;
  }

  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
          Diplomado Apostólico Pastoral
        </p>
        <h1 className="mb-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
          Hola, {firstName}.{" "}
          {isPaused ? (
            <span className="text-muted-foreground">Suscripción pausada.</span>
          ) : (
            <>
              Estás en el <span className="text-brand-coral">Mes {month} de 18</span>.
            </>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {ministryName && <span>{ministryName}</span>}
          {ministryName && country && <span className="text-border">·</span>}
          {country && <span>{country}</span>}
          {isAdmin && (
            <Badge className="bg-brand-coral text-brand-coral-foreground">
              Admin
            </Badge>
          )}
        </div>
      </header>

      {/* ============= ESTADO 3: banner de pausa ============= */}
      {isPaused && (
        <PauseBanner
          daysPaused={days}
          currentMonth={month}
          approvedCount={approvedCount}
          totalCount={totalCount}
          canRequestExtension={!hasExtensionForPhase}
        />
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        {/* Columna principal: progreso del mes + módulos */}
        <section>
          <div className="mb-6 rounded-2xl border bg-card p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                {phaseRow && (
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Fase {String(phaseRow.order_index).padStart(2, "0")} ·{" "}
                    {phaseRow.title}
                  </p>
                )}
                <h2 className="font-serif text-2xl font-semibold">
                  Progreso del Mes {month}
                </h2>
              </div>
              <p className="text-sm tabular-nums text-muted-foreground">
                <span className="text-2xl font-semibold text-foreground">
                  {approvedCount}
                </span>
                <span className="text-foreground"> / {totalCount}</span> aprobados
              </p>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand-coral transition-all"
                style={{
                  width: `${totalCount > 0 ? (approvedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>

            {firstPending && !isPaused && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Próximo paso
                  </p>
                  <p className="truncate font-medium">
                    Módulo {firstPending.order_index}: {firstPending.title}
                  </p>
                </div>
                <Button
                  size="sm"
                  render={
                    <Link
                      href={`/fases/${phaseRow?.slug ?? ""}/modulos/${firstPending.slug}`}
                    />
                  }
                >
                  Ir
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Lista de módulos */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <h3 className="border-b px-5 py-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Módulos del Mes {month}
            </h3>
            <ul>
              {modules.map((m) => (
                <li key={m.id} className="border-b last:border-b-0">
                  <Link
                    href={`/fases/${phaseRow?.slug ?? ""}/modulos/${m.slug}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
                  >
                    {m.approved ? (
                      <CheckCircle2
                        className="size-5 shrink-0 text-emerald-500"
                        strokeWidth={2}
                      />
                    ) : (
                      <Circle
                        className="size-5 shrink-0 text-muted-foreground/40"
                        strokeWidth={2}
                      />
                    )}
                    <span className="flex-1 truncate">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {String(m.order_index).padStart(2, "0")}
                      </span>{" "}
                      <span className="font-medium">{m.title}</span>
                      {m.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {m.subtitle}
                        </span>
                      )}
                    </span>
                    {m.approved ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-xs font-normal text-emerald-600"
                      >
                        Aprobado
                      </Badge>
                    ) : (
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground/50" />
                    )}
                  </Link>
                </li>
              ))}
              {modules.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No hay módulos cargados para el Mes {month} todavía.
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* Sidebar derecha: estado de la suscripción */}
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Tu suscripción
            </h3>
            <p className="mb-1 font-medium">
              {isPaused
                ? "Pausada"
                : sub.status === "trialing"
                  ? "En prueba"
                  : "Activa"}
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              {isPaused
                ? "Sin cargos hasta que retomes."
                : cancelDate
                  ? `Se cancela el ${cancelDate}.`
                  : nextBillDate
                    ? `Próximo cobro: ${nextBillDate}.`
                    : "—"}
            </p>
            <form action="/api/billing/portal" method="POST">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
              >
                Gestionar
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Tu recorrido
            </h3>
            <p className="mb-1 flex items-baseline gap-2">
              <span className="text-3xl font-serif font-semibold tabular-nums">
                {month}
              </span>
              <span className="text-sm text-muted-foreground">/ 18 meses</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {sub.months_paid_total === 0
                ? "Primer mes en curso."
                : `${sub.months_paid_total} ${sub.months_paid_total === 1 ? "mes" : "meses"} pagados.`}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed bg-muted/10 p-5">
            <Sparkles
              className="mb-2 size-5 text-brand-coral"
              strokeWidth={1.7}
            />
            <p className="text-sm font-medium">Tutor IA disponible</p>
            <p className="mt-1 mb-3 text-xs text-muted-foreground">
              Pregúntale sobre cualquier doctrina del DAP.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              render={<Link href="/tutor" />}
            >
              <Clock className="size-3.5" />
              Abrir tutor →
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
