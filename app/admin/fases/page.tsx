import Link from "next/link";
import Image from "next/image";
import { Check, X, Layers, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return {
    title: t("phases.metaTitle"),
  };
}

type PhaseRow = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  published: boolean;
  dimension: { name: string } | null;
  modules: { count: number }[] | null;
};

export default async function AdminBlocksPage() {
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .select(
      `id, order_index, slug, title, subtitle, cover_image_url, published,
       dimension:dimensions(name),
       modules(count)`,
    )
    .order("order_index", { ascending: true })
    .returns<PhaseRow[]>();
  if (error) {
    throw new Error(t("phases.loadError", { message: error.message }));
  }
  const phases = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("phases.eyebrow")}
            </p>
            <h1 className="font-serif text-3xl font-semibold">{t("phases.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("phases.description")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("phases.publishedCount", {
              published: phases.filter((b) => b.published).length,
              total: phases.length,
            })}
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead className="w-20">{t("phases.thCover")}</TableHead>
                <TableHead>{t("phases.thPhase")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("phases.thDimension")}</TableHead>
                <TableHead className="hidden sm:table-cell w-24 text-center">
                  {t("phases.thModules")}
                </TableHead>
                <TableHead className="w-28 text-center">{t("phases.thPublished")}</TableHead>
                <TableHead className="w-56 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {phases.map((b) => {
                const count = b.modules?.[0]?.count ?? 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-serif text-brand-coral">
                      {String(b.order_index).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      {b.cover_image_url ? (
                        <div className="relative size-12 overflow-hidden rounded-md border bg-muted">
                          <Image
                            src={b.cover_image_url}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-md border border-dashed bg-muted/30 text-[10px] text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{b.title}</p>
                      {b.subtitle && (
                        <p className="text-xs text-muted-foreground">
                          {b.subtitle}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {b.dimension?.name ? (
                        <Badge variant="secondary" className="font-normal">
                          {b.dimension.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center tabular-nums text-sm">
                      {count}
                    </TableCell>
                    <TableCell className="text-center">
                      {b.published ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                          <Check className="size-3" strokeWidth={3} />
                          {t("phases.yes")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          <X className="size-3" strokeWidth={3} />
                          {t("phases.no")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          render={
                            <Link href={`/admin/fases/${b.id}/modulos`} />
                          }
                        >
                          <Layers className="size-3.5" />
                          {t("phases.modules")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          render={
                            <Link href={`/admin/fases/${b.id}/editar`} />
                          }
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
