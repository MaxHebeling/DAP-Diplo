import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { BlockEditForm } from "./block-edit-form";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("blockEdit.metaTitle") };
}

type Row = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  brand_name: string | null;
  subtitle: string | null;
  promise: string | null;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  dimension: { name: string; order_index: number } | null;
};

export default async function EditBloquePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data: block } = await supabase
    .from("blocks")
    .select(
      "id, order_index, slug, title, brand_name, subtitle, promise, description, cover_image_url, published, dimension:ranks(name, order_index)",
    )
    .eq("slug", slug)
    .maybeSingle<Row>();
  if (!block) notFound();

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/bloques"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t("blockEdit.backToBlocks")}
        </Link>

        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {block.dimension
                ? t("blockEdit.blockEyebrowWithDimension", {
                    index: String(block.order_index).padStart(2, "0"),
                    dimension: block.dimension.name,
                  })
                : t("blockEdit.blockEyebrow", {
                    index: String(block.order_index).padStart(2, "0"),
                  })}
            </p>
            <h1 className="mt-1 font-grotesk text-3xl font-bold tracking-tight">
              {t("blockEdit.title")}
            </h1>
          </div>
          {block.cover_image_url && (
            <Image
              src={block.cover_image_url}
              alt=""
              width={80}
              height={80}
              className="size-20 rounded-lg object-cover"
            />
          )}
        </header>

        <BlockEditForm
          initial={{
            slug: block.slug,
            brandName: block.brand_name ?? "",
            title: block.title,
            subtitle: block.subtitle ?? "",
            promise: block.promise ?? "",
            description: block.description ?? "",
            coverImageUrl: block.cover_image_url ?? "",
            published: block.published,
          }}
        />
      </div>
    </main>
  );
}
