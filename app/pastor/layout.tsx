import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PastorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/pastor");

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name")
    .eq("id", user.id).maybeSingle<{ role: string; full_name: string }>();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const firstName = profile.full_name.split(" ")[0];
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-coral">Portal Pastor</p>
            <h1 className="mt-0.5 font-grotesk text-xl font-bold">Pastor {firstName}</h1>
          </div>
          <nav className="flex gap-3 text-sm">
            <a href="/pastor" className="text-muted-foreground hover:text-foreground">Alumnos</a>
            <a href="/pastor/liquidacion" className="text-muted-foreground hover:text-foreground">Liquidación</a>
          </nav>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 lg:px-10">{children}</main>
    </div>
  );
}
