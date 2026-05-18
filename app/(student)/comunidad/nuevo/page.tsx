import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { createClient } from "@/lib/supabase/server";
import { requireForumAccess } from "@/lib/forum/gate";

export const metadata = { title: "Nuevo hilo — Comunidad DAP" };

export default async function NuevoHiloPage() {
  await requireForumAccess("/comunidad/nuevo");

  const supabase = await createClient();
  const { data: phases } = await supabase
    .from("phases")
    .select("id, order_index, title")
    .order("order_index", { ascending: true });

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/comunidad"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          Volver a la comunidad
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Comunidad
          </p>
          <h1 className="font-serif text-3xl font-semibold">Nuevo hilo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparte una pregunta, una revelación o invita a una conversación.
            Markdown soportado.
          </p>
        </header>

        <NewThreadForm
          phases={(phases ?? []) as { id: string; order_index: number; title: string }[]}
        />
      </div>
    </main>
  );
}
