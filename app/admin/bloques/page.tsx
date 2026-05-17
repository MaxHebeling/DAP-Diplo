import Link from "next/link";
import Image from "next/image";
import { Check, X, Pencil } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Bloques — Admin DAP",
};

type BlockRow = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  published: boolean;
  rank: { name: string } | null;
  modules: { count: number }[] | null;
};

export default async function AdminBlocksPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocks")
    .select(
      `id, order_index, slug, title, subtitle, cover_image_url, published,
       rank:ranks(name),
       modules(count)`,
    )
    .order("order_index", { ascending: true })
    .returns<BlockRow[]>();
  if (error) {
    throw new Error(`No se pudo cargar bloques: ${error.message}`);
  }
  const blocks = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              Admin
            </p>
            <h1 className="font-serif text-3xl font-semibold">Bloques</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Los 9 bloques del diplomado. Edita metadatos, sube portada y
              publica/despublica.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {blocks.filter((b) => b.published).length} / {blocks.length} publicados
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead className="w-20">Portada</TableHead>
                <TableHead>Bloque</TableHead>
                <TableHead className="hidden md:table-cell">Rango</TableHead>
                <TableHead className="hidden sm:table-cell w-24 text-center">
                  Módulos
                </TableHead>
                <TableHead className="w-28 text-center">Publicado</TableHead>
                <TableHead className="w-24 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map((b) => {
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
                      {b.rank?.name ? (
                        <Badge variant="secondary" className="font-normal">
                          {b.rank.name}
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
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          <X className="size-3" strokeWidth={3} />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link href={`/admin/bloques/${b.id}/editar`} />
                        }
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
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
