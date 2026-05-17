import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/auth/sign-out-button";
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
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Tu suscripción
            </h2>
            <p className="mb-3 text-2xl font-semibold">Sin suscripción activa</p>
            <p className="mb-5 text-sm text-muted-foreground">
              Acceso al Bloque 1 y a las sesiones en vivo desde $25 USD/mes.
            </p>
            <Button render={<Link href="/diplomado" />}>
              Ver el diplomado
            </Button>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Tu progreso
            </h2>
            <p className="mb-3 text-2xl font-semibold">0 de 9 bloques</p>
            <p className="mb-5 text-sm text-muted-foreground">
              Cada bloque completado te otorga un rango ministerial.
            </p>
            <Button variant="outline" disabled>
              Aún sin avance
            </Button>
          </div>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Esta vista es mínima — se expandirá en fases posteriores (suscripción
          real, bloques desbloqueados, calendario de sesiones, rango actual).
        </p>
      </div>
    </main>
  );
}
