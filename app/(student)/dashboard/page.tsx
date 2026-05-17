import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ToastFromQuery } from "@/components/toast-from-query";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Mi dashboard — DAP",
};

type ProfileRow = {
  full_name: string;
  ministry_name: string | null;
  country: string | null;
  role: "student" | "admin";
};

type SubscriptionRow = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  months_paid_total: number;
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, ministry_name, country, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(`No se pudo cargar tu perfil: ${error.message}`);
  }
  if (!profile) {
    throw new Error("Tu perfil no existe en la base de datos.");
  }

  // Suscripción real (puede no existir, estar activa, cancelada, etc.)
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end, months_paid_total")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  const hasActive =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing") &&
    (sub.current_period_end === null ||
      new Date(sub.current_period_end) > new Date());

  // Conteo de bloques desbloqueados (drip)
  const { count: unlockedBlocks } = await supabase
    .from("block_access")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <Suspense fallback={null}>
        <ToastFromQuery />
      </Suspense>
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

        <header className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-magenta">
            Diplomado Apostólico Pastoral
          </p>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Hola, {profile.full_name.split(" ")[0]}.
          </h1>
          <p className="text-muted-foreground">
            {profile.ministry_name
              ? `${profile.ministry_name} · ${profile.country ?? "—"}`
              : (profile.country ?? "Bienvenido")}
          </p>
          {profile.role === "admin" && (
            <Badge className="mt-3 bg-brand text-brand-foreground">Admin</Badge>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Suscripción */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Tu suscripción
            </h2>
            {hasActive ? (
              <>
                <p className="mb-1 text-2xl font-semibold capitalize">
                  {sub?.status === "trialing" ? "En prueba" : "Activa"}
                </p>
                <p className="mb-5 text-sm text-muted-foreground">
                  {sub?.cancel_at_period_end
                    ? `Se cancelará el ${formatDate(sub.current_period_end)}.`
                    : `Próximo cobro: ${formatDate(sub?.current_period_end ?? null) ?? "—"}.`}
                </p>
                <form action="/api/billing/portal" method="POST">
                  <Button type="submit" className="w-full sm:w-auto">
                    Gestionar mi suscripción
                  </Button>
                </form>
                <p className="mt-3 text-xs text-muted-foreground">
                  Cambia tu tarjeta, ve facturas o cancela cuando quieras.
                </p>
              </>
            ) : sub ? (
              <>
                <p className="mb-1 text-2xl font-semibold capitalize">
                  {sub.status === "past_due"
                    ? "Pago pendiente"
                    : sub.status === "canceled"
                      ? "Cancelada"
                      : sub.status}
                </p>
                <p className="mb-5 text-sm text-muted-foreground">
                  Reactiva tu suscripción para recuperar el acceso. Tu progreso
                  está guardado.
                </p>
                <Button render={<Link href="/suscribirme" />}>
                  Reactivar suscripción
                </Button>
              </>
            ) : (
              <>
                <p className="mb-3 text-2xl font-semibold">
                  Sin suscripción activa
                </p>
                <p className="mb-5 text-sm text-muted-foreground">
                  Acceso al Bloque 1 y a las sesiones en vivo desde $25 USD/mes.
                </p>
                <Button render={<Link href="/suscribirme" />}>
                  Suscribirme — $25/mes
                </Button>
              </>
            )}
          </div>

          {/* Progreso */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Tu progreso
            </h2>
            <p className="mb-3 text-2xl font-semibold">
              {unlockedBlocks ?? 0} de 9 bloques
            </p>
            <p className="mb-5 text-sm text-muted-foreground">
              {(unlockedBlocks ?? 0) === 0
                ? "Cada bloque completado te otorga un rango ministerial."
                : `Cada 2 meses se desbloquea un bloque nuevo.${sub ? ` Llevas ${sub.months_paid_total} ${sub.months_paid_total === 1 ? "mes" : "meses"}.` : ""}`}
            </p>
            <Button
              variant="outline"
              render={<Link href="/#bloques" />}
              disabled={!hasActive}
            >
              {(unlockedBlocks ?? 0) > 0 ? "Continuar" : "Ver el diplomado"}
            </Button>
          </div>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Esta vista se expandirá: calendario de sesiones en vivo, último módulo
          visto, certificados emitidos, rango actual.
        </p>
      </div>
    </main>
  );
}
