import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LiveSessionForm } from "@/components/admin/live-session-form";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("liveNew.metaTitle") };
}

export default async function NuevaSesionPage() {
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data: phases } = await supabase
    .from("phases")
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
          {t("liveNew.backToSessions")}
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("liveNew.eyebrow")}
          </p>
          <h1 className="font-grotesk text-3xl font-semibold">{t("liveNew.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("liveNew.description")}
          </p>
        </header>

        <LiveSessionForm
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
