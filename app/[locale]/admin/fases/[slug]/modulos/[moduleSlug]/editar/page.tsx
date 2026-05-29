import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  ModuleEditForm,
  type ModuleFormModule,
} from "@/components/admin/module-edit-form";
import { ModulePdfManager } from "@/components/admin/module-pdf-manager";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ slug: string; moduleSlug: string }> };

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("moduleEdit.metaTitle") };
}

export default async function AdminModuleEditPage({ params }: PageProps) {
  const { slug: id, moduleSlug: mid } = await params;
  const t = await getTranslations("Admin");
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
      "id, phase_id, order_index, title, subtitle, description, objective, main_revelation, impartation_phrase, title_en, subtitle_en, description_en, objective_en, main_revelation_en, impartation_phrase_en, duration_minutes, is_free_preview",
    )
    .eq("id", mid)
    .maybeSingle();
  if (!mod || mod.phase_id !== id) notFound();

  // PDFs existentes del módulo (kind='pdf'), con su locale
  const { data: pdfs } = await supabase
    .from("module_resources")
    .select("id, title, url, kind, order_index, locale")
    .eq("module_id", mod.id)
    .eq("kind", "pdf")
    .order("order_index", { ascending: true })
    .returns<{
      id: string;
      title: string;
      url: string;
      kind: string;
      order_index: number;
      locale: "es" | "en";
    }[]>();

  const formMod: ModuleFormModule = {
    id: mod.id,
    phase_id: mod.phase_id,
    title: mod.title,
    subtitle: mod.subtitle,
    description: mod.description,
    objective: mod.objective,
    main_revelation: mod.main_revelation,
    impartation_phrase: mod.impartation_phrase,
    title_en: mod.title_en,
    subtitle_en: mod.subtitle_en,
    description_en: mod.description_en,
    objective_en: mod.objective_en,
    main_revelation_en: mod.main_revelation_en,
    impartation_phrase_en: mod.impartation_phrase_en,
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
          {t("moduleEdit.backToModules")}
        </Link>

        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("moduleEdit.eyebrow", {
                index: String(phase.order_index).padStart(2, "0"),
                phaseTitle: phase.title,
              })}
            </p>
            <h1 className="font-serif text-3xl font-semibold">
              {t("moduleEdit.title", {
                index: String(mod.order_index).padStart(2, "0"),
              })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("moduleEdit.description")}
            </p>
          </div>
          <Button
            variant="outline"
            render={
              <Link href={`/admin/fases/${id}/modulos/${mid}/secciones`} />
            }
          >
            <Layers className="size-4" />
            {t("moduleEdit.editSections")}
          </Button>
        </header>

        <ModuleEditForm mod={formMod} />

        <div className="mt-10">
          <ModulePdfManager
            moduleId={mod.id}
            initialPdfs={(pdfs ?? []).map((p) => ({
              id: p.id,
              title: p.title,
              url: p.url,
              locale: p.locale,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
