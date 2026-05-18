import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ModuleEditForm,
  type ModuleFormModule,
} from "@/components/admin/module-edit-form";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string; mid: string }> };

export const metadata = { title: "Editar módulo — Admin DAP" };

export default async function AdminModuleEditPage({ params }: PageProps) {
  const { id, mid } = await params;
  const supabase = await createClient();

  const { data: phase } = await supabase
    .from("phases")
    .select("id, order_index, title")
    .eq("id", id)
    .maybeSingle();
  if (!phase) notFound();

  const { data: mod } = await supabase
    .from("modules")
    .select(
      "id, phase_id, order_index, title, subtitle, description, objective, main_revelation, impartation_phrase, duration_minutes, is_free_preview",
    )
    .eq("id", mid)
    .maybeSingle();
  if (!mod || mod.phase_id !== id) notFound();

  const formMod: ModuleFormModule = {
    id: mod.id,
    phase_id: mod.phase_id,
    title: mod.title,
    subtitle: mod.subtitle,
    description: mod.description,
    objective: mod.objective,
    main_revelation: mod.main_revelation,
    impartation_phrase: mod.impartation_phrase,
    duration_minutes: mod.duration_minutes,
    is_free_preview: mod.is_free_preview,
  };

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/admin/fases/${id}/modulos`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          Volver a módulos
        </Link>

        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              Fase {String(phase.order_index).padStart(2, "0")} · {phase.title}
            </p>
            <h1 className="font-serif text-3xl font-semibold">
              Módulo {String(mod.order_index).padStart(2, "0")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Edita la identidad y el contenido apostólico del módulo.
            </p>
          </div>
          <Button
            variant="outline"
            render={
              <Link href={`/admin/fases/${id}/modulos/${mid}/secciones`} />
            }
          >
            <Layers className="size-4" />
            Editar secciones
          </Button>
        </header>

        <ModuleEditForm mod={formMod} />
      </div>
    </main>
  );
}
