import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("blocks.metaTitle") };
}

type Row = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  brand_name: string | null;
  subtitle: string | null;
  promise: string | null;
  published: boolean;
  cover_image_url: string | null;
};

export default async function AdminBloquesPage() {
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocks")
    .select(
      "id, order_index, slug, title, brand_name, subtitle, promise, published, cover_image_url",
    )
    .order("order_index", { ascending: true })
    .returns<Row[]>();
  if (error) throw new Error(t("blocks.loadError", { message: error.message }));
  const rows = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-coral/15 text-brand-coral">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("blocks.eyebrow")}
            </p>
            <h1 className="font-grotesk text-3xl font-bold tracking-tight">
              {t("blocks.title")}
            </h1>
          </div>
        </header>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06]">
                <TableHead className="w-16">#</TableHead>
                <TableHead>{t("blocks.thBlock")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("blocks.thSubtitle")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("blocks.thPromise")}</TableHead>
                <TableHead>{t("blocks.thStatus")}</TableHead>
                <TableHead className="text-right">{t("blocks.thEdit")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="border-white/[0.04]">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {String(r.order_index).padStart(2, "0")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {r.cover_image_url && (
                        <Image
                          src={r.cover_image_url}
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {r.brand_name ?? r.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.title}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground md:table-cell">
                    {r.subtitle ?? <em className="text-text-tertiary">{t("blocks.empty")}</em>}
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground lg:table-cell">
                    {r.promise ?? <em className="text-text-tertiary">{t("blocks.empty")}</em>}
                  </TableCell>
                  <TableCell>
                    {r.published ? (
                      <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                        <CheckCircle2 className="mr-1 size-3" />
                        {t("blocks.published")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("blocks.draft")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/bloques/${r.slug}`}
                      className="text-sm font-medium text-brand-coral hover:underline"
                    >
                      {t("blocks.edit")}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="mt-4 text-xs text-text-tertiary">
          {t("blocks.footnote")}
        </p>
      </div>
    </main>
  );
}
