import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PastorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/pastor");

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name")
    .eq("id", user.id).maybeSingle<{ role: string; full_name: string }>();
  if (!profile) redirect("/dashboard");

  // Acceso permitido si:
  //   - role === 'pastor' (caso estándar), o
  //   - role === 'student' pero tiene al menos una asignación activa en
  //     church_pastors (alumno-que-también-pastorea, ej. Yesica Paz).
  // Usamos createAdminClient() para el check porque RLS de church_pastors
  // solo deja al pastor leer sus propias filas — si el layout usara el
  // supabase autenticado y RLS glitchara devolvería 0 filas y bloquearía
  // el acceso. Ya nos pasó con is_admin() (2026-07-25).
  const isPastor = profile.role === "pastor";
  let isDualRolePastor = false;
  if (!isPastor && profile.role === "student") {
    const admin = createAdminClient();
    const { count } = await admin
      .from("church_pastors")
      .select("id", { count: "exact", head: true })
      .eq("pastor_user_id", user.id)
      .eq("status", "active");
    isDualRolePastor = (count ?? 0) > 0;
  }
  if (!isPastor && !isDualRolePastor) redirect("/dashboard");

  const firstName = profile.full_name.split(" ")[0];
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">Portal Pastor</p>
            <h1 className="mt-0.5 font-grotesk text-xl font-bold">Pastor {firstName}</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a href="/pastor" className="text-muted-foreground hover:text-foreground">Alumnos</a>
            <a href="/pastor/liquidacion" className="text-muted-foreground hover:text-foreground">Liquidación</a>
            <a
              href="/dashboard"
              className="ml-2 rounded-md border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-white/[0.2] hover:text-foreground"
            >
              ← Mi dashboard
            </a>
          </nav>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
