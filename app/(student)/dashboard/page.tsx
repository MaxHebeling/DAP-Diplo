import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  GraduationCap,
  Sparkles,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

import { DapButton } from "@/components/ui-dap/button";
import {
  DapCard,
  DapCardDescription,
  DapCardHeader,
  DapCardTitle,
} from "@/components/ui-dap/card";
import { DapStat } from "@/components/ui-dap/stat";
import { DapStudentSidebar } from "@/components/layouts/dap-student-sidebar";
import { DapStudentTopbar } from "@/components/layouts/dap-student-topbar";

export const metadata = { title: "Mi dashboard — DAP" };

type ProfileRow = {
  full_name: string;
  ministry_name: string | null;
  country: string | null;
  avatar_url: string | null;
  role: "student" | "admin";
};

type SubscriptionRow = {
  id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
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

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("full_name, ministry_name, country, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (profErr) throw new Error(`No se pudo cargar perfil: ${profErr.message}`);
  if (!profile) throw new Error("Tu perfil no existe en la base de datos.");

  const firstName = profile.full_name.split(" ")[0];

  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "id, status, current_period_end, cancel_at_period_end, cancel_at",
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

  return (
    <div className="flex min-h-screen bg-surface-base text-text-primary">
      <DapStudentSidebar
        userName={profile.full_name}
        userAvatar={profile.avatar_url}
        onSignOut={signOutAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DapStudentTopbar title="Inicio" />

        <main className="flex-1 overflow-y-auto px-6 py-10 sm:px-10">
          {!hasActive && (
            <NoSubscriptionState
              firstName={firstName}
              hadCanceledSub={!!sub && sub.status === "canceled"}
            />
          )}

          {hasActive && sub && (
            <ActiveSubscriptionDashboard
              firstName={firstName}
              isAdmin={profile.role === "admin"}
              cancelDate={
                sub.cancel_at_period_end || sub.cancel_at
                  ? formatDate(sub.cancel_at ?? sub.current_period_end)
                  : null
              }
              nextBillDate={formatDate(sub.current_period_end)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// =====================================================================
// ESTADO 1: SIN suscripción activa
// =====================================================================
function NoSubscriptionState({
  firstName,
  hadCanceledSub,
}: {
  firstName: string;
  hadCanceledSub: boolean;
}) {
  return (
    <div className="relative isolate mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-elevated p-12 text-center">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-50 [background:radial-gradient(60%_50%_at_50%_30%,rgba(123,97,255,0.25),transparent_55%),radial-gradient(60%_50%_at_50%_70%,rgba(255,77,109,0.18),transparent_55%)]"
      />
      <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1 font-inter text-xs font-medium uppercase tracking-widest text-text-secondary backdrop-blur">
        <Sparkles className="size-3.5 text-brand-coral" />
        Diplomado Apostólico Pastoral
      </p>
      <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
        Hola, {firstName}.{" "}
        {hadCanceledSub ? (
          <span className="gradient-text">Reactiva tu diplomado</span>
        ) : (
          <span className="gradient-text">Comienza tu formación</span>
        )}
      </h1>
      <p className="mx-auto mt-4 max-w-xl font-inter text-base leading-relaxed text-text-secondary">
        {hadCanceledSub
          ? "Tu suscripción está cancelada pero conservamos todo tu progreso: módulos aprobados, dimensiones alcanzadas y certificados. Cuando reactives, retomas donde lo dejaste."
          : "18 meses de formación con 72 módulos (1 por semana). Sesiones en vivo y mentoría grupal incluidas. $25 USD/mes, cancela cuando quieras."}
      </p>
      <div className="mt-8">
        <DapButton render={<Link href="/suscribirme" />} size="lg">
          {hadCanceledSub ? "Reactivar suscripción" : "Suscribirme — $25/mes"}
          <ArrowRight />
        </DapButton>
      </div>
    </div>
  );
}

// =====================================================================
// ESTADO 2: con sub activa
// =====================================================================
// NOTA v3.3: el calendario semanal + módulo de la semana aún no está
// implementado (pendiente migration 0011 con current_program_week +
// is_module_week_open + tabla admissions). Este dashboard interim
// solo muestra el estado de la suscripción + accesos.
function ActiveSubscriptionDashboard({
  firstName,
  isAdmin,
  cancelDate,
  nextBillDate,
}: {
  firstName: string;
  isAdmin: boolean;
  cancelDate: string | null;
  nextBillDate: string | null;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
            Diplomado Apostólico Pastoral
          </p>
          <h1 className="mt-2 font-grotesk text-h1 font-bold leading-tight text-text-primary">
            Hola, {firstName}.
          </h1>
          {isAdmin && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-0.5 font-inter text-xs font-medium text-brand-violet">
              Admin
            </p>
          )}
        </div>
      </header>

      {/* Aviso: calendario semanal pendiente */}
      <DapCard>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-violet/10 text-brand-violet">
            <CalendarClock className="size-6" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-grotesk text-h4 font-semibold text-text-primary">
              Calendario semanal — en preparación
            </h2>
            <p className="mt-2 font-inter text-sm leading-relaxed text-text-secondary">
              Pronto verás aquí el módulo de la semana, tu progreso del
              programa y los próximos eventos en vivo. Mientras tanto podés
              explorar los bloques disponibles.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <DapButton
                render={<Link href="/fases" />}
                variant="secondary"
                size="sm"
              >
                Ver bloques
                <ArrowRight />
              </DapButton>
              <DapButton
                render={<Link href="/tutor" />}
                variant="ghost"
                size="sm"
              >
                Abrir Tutor IA
              </DapButton>
            </div>
          </div>
        </div>
      </DapCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DapCard>
          <DapStat
            icon={Calendar}
            value="18"
            label="meses de programa"
          />
        </DapCard>
        <DapCard>
          <DapStat
            icon={GraduationCap}
            value="72"
            label="módulos · 1 por semana"
            accent="coral"
          />
        </DapCard>
        <DapCard>
          <DapStat
            icon={Sparkles}
            value="9"
            label="rangos · 1 por bloque"
            accent="amber"
          />
        </DapCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Recursos */}
        <section className="space-y-6">
          <DapCard>
            <DapCardHeader>
              <DapCardTitle>Recursos disponibles</DapCardTitle>
              <DapCardDescription>
                Mientras se habilita el calendario semanal.
              </DapCardDescription>
            </DapCardHeader>
            <ul className="mt-4 space-y-3 font-inter text-sm">
              <li className="flex items-center gap-3">
                <ArrowRight className="size-3.5 text-brand-coral" />
                <Link
                  href="/comunidad"
                  className="text-text-primary hover:text-brand-coral"
                >
                  Comunidad de pastores en formación
                </Link>
              </li>
              <li className="flex items-center gap-3">
                <ArrowRight className="size-3.5 text-brand-coral" />
                <Link
                  href="/en-vivo"
                  className="text-text-primary hover:text-brand-coral"
                >
                  Próximas sesiones en vivo (MasterClass + mentoría)
                </Link>
              </li>
              <li className="flex items-center gap-3">
                <ArrowRight className="size-3.5 text-brand-coral" />
                <Link
                  href="/tutor"
                  className="text-text-primary hover:text-brand-coral"
                >
                  Tutor IA — preguntá sobre cualquier doctrina del DAP
                </Link>
              </li>
            </ul>
          </DapCard>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <DapCard>
            <h3 className="font-inter text-xs font-medium uppercase tracking-widest text-text-tertiary">
              Tu suscripción
            </h3>
            <p className="mt-2 font-grotesk text-h4 font-semibold text-text-primary">
              Activa
            </p>
            <p className="mt-1 font-inter text-xs text-text-secondary">
              {cancelDate
                ? `Se cancela el ${cancelDate}.`
                : nextBillDate
                  ? `Próximo cobro: ${nextBillDate}.`
                  : "—"}
            </p>
            <form action="/api/billing/portal" method="POST" className="mt-4">
              <DapButton
                type="submit"
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Gestionar
              </DapButton>
            </form>
          </DapCard>

          <div className="relative overflow-hidden rounded-xl border border-brand-violet/20 bg-brand-violet/[0.04] p-5">
            <Sparkles
              className="mb-2 size-5 text-brand-coral"
              strokeWidth={1.8}
            />
            <p className="font-grotesk text-sm font-semibold text-text-primary">
              Tutor IA disponible
            </p>
            <p className="mt-1 font-inter text-xs leading-relaxed text-text-secondary">
              Pregúntale sobre cualquier doctrina del DAP.
            </p>
            <DapButton
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start px-0"
              render={<Link href="/tutor" />}
            >
              Abrir tutor
              <ArrowRight />
            </DapButton>
          </div>
        </aside>
      </div>
    </div>
  );
}
