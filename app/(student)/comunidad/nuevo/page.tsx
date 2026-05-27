import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { createClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/localized";
import type { Locale } from "@/i18n/config";
import { requireForumAccess } from "@/lib/forum/gate";

export async function generateMetadata() {
  const t = await getTranslations("Student");
  return { title: t("communityNew.metaTitle") };
}

export default async function NuevoHiloPage() {
  await requireForumAccess("/comunidad/nuevo");

  const t = await getTranslations("Student");
  const locale = (await getLocale()) as Locale;
  const supabase = await createClient();
  const { data: phases } = await supabase
    .from("phases")
    .select("id, order_index, title, title_en")
    .order("order_index", { ascending: true });

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/comunidad"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          {t("communityNew.back")}
        </Link>

        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("communityNew.eyebrow")}
          </p>
          <h1 className="font-serif text-3xl font-semibold">
            {t("communityNew.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("communityNew.subtitle")}
          </p>
        </header>

        <NewThreadForm
          phases={(
            (phases ?? []) as {
              id: string;
              order_index: number;
              title: string;
              title_en: string | null;
            }[]
          ).map((p) => ({
            id: p.id,
            order_index: p.order_index,
            title: localized(p, "title", locale) ?? p.title,
          }))}
        />
      </div>
    </main>
  );
}
