import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LiveSessionForm } from "@/components/admin/live-session-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Nueva sesión — Admin DAP" };

export default async function NuevaSesionPage() {
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("blocks")
    .select("id, order_index, title")
    .order("order_index", { ascending: true });

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/en-vivo"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          Volver a sesiones
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Admin · En vivo
          </p>
          <h1 className="font-serif text-3xl font-semibold">Nueva sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agenda una MasterClass, activación, mentoría grupal o evento
            especial. El recording se sube después.
          </p>
        </header>

        <LiveSessionForm
          blocks={
            (blocks ?? []) as {
              id: string;
              order_index: number;
              title: string;
            }[]
          }
        />
      </div>
    </main>
  );
}
