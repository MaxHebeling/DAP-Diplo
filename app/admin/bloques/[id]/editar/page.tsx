import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BlockEditForm } from "@/components/admin/block-edit-form";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("blocks")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return {
    title: data?.title ? `Editar: ${data.title} — Admin DAP` : "Editar bloque",
  };
}

export default async function EditBlockPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Layout admin ya gated, RLS de blocks admin-full vía is_admin().
  const { data: block, error } = await supabase
    .from("blocks")
    .select(
      "id, order_index, slug, title, subtitle, description, cover_image_url, months_duration, rank_id, published",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(`No se pudo cargar el bloque: ${error.message}`);
  }
  if (!block) notFound();

  const { data: ranks } = await supabase
    .from("ranks")
    .select("id, order_index, name")
    .order("order_index", { ascending: true });

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/bloques"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          Volver a bloques
        </Link>

        <header className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Bloque {String(block.order_index).padStart(2, "0")}
          </p>
          <h1 className="font-serif text-3xl font-semibold leading-tight">
            {block.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edita los metadatos. Cuando guardes, se revalidan la landing y la
            página pública del bloque.
          </p>
        </header>

        <BlockEditForm block={block} ranks={ranks ?? []} />
      </div>
    </main>
  );
}
