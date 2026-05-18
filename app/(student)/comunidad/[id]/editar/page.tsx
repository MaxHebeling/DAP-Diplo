import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EditThreadForm } from "@/components/forum/edit-thread-form";
import { createClient } from "@/lib/supabase/server";
import { requireForumAccess } from "@/lib/forum/gate";

type PageProps = { params: Promise<{ id: string }> };

export const metadata = { title: "Editar hilo — Comunidad DAP" };

export default async function EditThreadPage({ params }: PageProps) {
  const { id } = await params;
  const { userId, isAdmin } = await requireForumAccess(
    `/comunidad/${id}/editar`,
  );

  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, title, body, phase_id, author_id, closed")
    .eq("id", id)
    .maybeSingle();
  if (!thread) notFound();

  if (thread.author_id !== userId && !isAdmin) {
    redirect(`/comunidad/${id}`);
  }
  if (thread.closed && !isAdmin) {
    redirect(`/comunidad/${id}`);
  }

  const { data: phases } = await supabase
    .from("phases")
    .select("id, order_index, title")
    .order("order_index", { ascending: true });

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/comunidad/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          Volver al hilo
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Comunidad
          </p>
          <h1 className="font-serif text-3xl font-semibold">Editar hilo</h1>
        </header>

        <EditThreadForm
          thread={{
            id: thread.id,
            title: thread.title,
            body: thread.body,
            phase_id: thread.phase_id,
          }}
          phases={
            (phases ?? []) as {
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
