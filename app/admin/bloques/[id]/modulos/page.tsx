import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, Pencil } from "lucide-react";
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

type PageProps = { params: Promise<{ id: string }> };

type ModuleRow = {
  id: string;
  order_index: number;
  slug: string;
  title: string;
  subtitle: string | null;
  is_free_preview: boolean;
  sections: {
    body_md: string | null;
    mux_playback_id: string | null;
  }[];
};

export const metadata = { title: "Módulos del bloque — Admin DAP" };

export default async function AdminBlockModulesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: block } = await supabase
    .from("blocks")
    .select("id, order_index, title")
    .eq("id", id)
    .maybeSingle();
  if (!block) notFound();

  const { data, error } = await supabase
    .from("modules")
    .select(
      "id, order_index, slug, title, subtitle, is_free_preview, sections:module_sections(body_md, mux_playback_id)",
    )
    .eq("block_id", id)
    .order("order_index", { ascending: true })
    .returns<ModuleRow[]>();
  if (error) {
    throw new Error(`No se pudieron cargar los módulos: ${error.message}`);
  }
  const modules = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/bloques"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          Volver a bloques
        </Link>

        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              Bloque {String(block.order_index).padStart(2, "0")} · {block.title}
            </p>
            <h1 className="font-serif text-3xl font-semibold">Módulos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {modules.length} módulos en este bloque. Edita metadatos o entra a
              las 5 secciones para poblar contenido.
            </p>
          </div>
        </header>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Slug</TableHead>
                <TableHead className="w-32 text-center">Contenido</TableHead>
                <TableHead className="w-40 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((m) => {
                const filled = m.sections.filter(
                  (s) =>
                    (s.body_md && s.body_md.trim().length > 0) ||
                    (s.mux_playback_id && s.mux_playback_id.length > 0),
                ).length;
                const total = m.sections.length || 5;
                const pct = Math.round((filled / total) * 100);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-serif text-brand-coral tabular-nums">
                      {String(m.order_index).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{m.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {m.subtitle && (
                          <p className="text-xs text-muted-foreground">
                            {m.subtitle}
                          </p>
                        )}
                        {m.is_free_preview && (
                          <Badge className="bg-brand-coral text-brand-coral-foreground">
                            Free preview
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {m.slug}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {filled} / {total}
                        </span>
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-brand-coral transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          render={
                            <Link
                              href={`/admin/bloques/${id}/modulos/${m.id}/secciones`}
                            />
                          }
                        >
                          <Layers className="size-3.5" />
                          Secciones
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          render={
                            <Link
                              href={`/admin/bloques/${id}/modulos/${m.id}/editar`}
                            />
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
