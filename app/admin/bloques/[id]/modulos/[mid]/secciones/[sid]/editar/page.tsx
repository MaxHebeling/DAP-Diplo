import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  SectionEditForm,
  type SectionFormSection,
} from "@/components/admin/section-edit-form";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string; mid: string; sid: string }>;
};

export const metadata = { title: "Editar sección — Admin DAP" };

export default async function AdminSectionEditPage({ params }: PageProps) {
  const { id, mid, sid } = await params;
  const supabase = await createClient();

  const { data: block } = await supabase
    .from("blocks")
    .select("id, order_index, title")
    .eq("id", id)
    .maybeSingle();
  if (!block) notFound();

  const { data: mod } = await supabase
    .from("modules")
    .select("id, block_id, order_index, title")
    .eq("id", mid)
    .maybeSingle();
  if (!mod || mod.block_id !== id) notFound();

  const { data: section } = await supabase
    .from("module_sections")
    .select(
      "id, module_id, kind, order_index, title, body_md, mux_playback_id, duration_seconds",
    )
    .eq("id", sid)
    .maybeSingle();
  if (!section || section.module_id !== mid) notFound();

  const formSection: SectionFormSection = {
    id: section.id,
    module_id: section.module_id,
    block_id: id,
    kind: section.kind,
    title: section.title,
    body_md: section.body_md,
    mux_playback_id: section.mux_playback_id,
    duration_seconds: section.duration_seconds,
  };

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/admin/bloques/${id}/modulos/${mid}/secciones`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          Volver a secciones
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            Bloque {String(block.order_index).padStart(2, "0")} · Módulo{" "}
            {String(mod.order_index).padStart(2, "0")} · {mod.title}
          </p>
          <h1 className="font-serif text-3xl font-semibold">
            Sección {String(section.order_index).padStart(2, "0")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edita el contenido de esta sección. Los cambios son inmediatos para
            los alumnos con acceso al bloque.
          </p>
        </header>

        <SectionEditForm section={formSection} />
      </div>
    </main>
  );
}
