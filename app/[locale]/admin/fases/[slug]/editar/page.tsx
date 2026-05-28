import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PhaseEditForm } from "@/components/admin/phase-edit-form";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug: id } = await params;
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("phases")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return {
    title: data?.title
      ? t("phaseEdit.metaTitleWithName", { title: data.title })
      : t("phaseEdit.metaTitleFallback"),
  };
}

export default async function EditBlockPage({ params }: PageProps) {
  const { slug: id } = await params;
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  // Layout admin ya gated, RLS de phases admin-full vía is_admin().
  const { data: phase, error } = await supabase
    .from("phases")
    .select(
      "id, order_index, slug, title, subtitle, description, cover_image_url, title_en, subtitle_en, description_en, months_duration, dimension_id, published",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(t("phaseEdit.loadError", { message: error.message }));
  }
  if (!phase) notFound();

  const { data: dimensions } = await supabase
    .from("dimensions")
    .select("id, order_index, name")
    .order("order_index", { ascending: true });

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/fases"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          {t("phaseEdit.backToPhases")}
        </Link>

        <header className="mb-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("phaseEdit.eyebrow", {
              index: String(phase.order_index).padStart(2, "0"),
            })}
          </p>
          <h1 className="font-serif text-3xl font-semibold leading-tight">
            {phase.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("phaseEdit.description")}
          </p>
        </header>

        <PhaseEditForm phase={phase} dimensions={dimensions ?? []} />
      </div>
    </main>
  );
}
