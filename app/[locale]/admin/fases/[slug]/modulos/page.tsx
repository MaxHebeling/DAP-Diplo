import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
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

type PageProps = { params: Promise<{ slug: string }> };

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

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("phaseModules.metaTitle") };
}

export default async function AdminBlockModulesPage({ params }: PageProps) {
  const { slug: id } = await params;
  const t = await getTranslations("Admin");
  const supabase = await createClient();

  const { data: phase } = await supabase
    .from("phases")
    .select("id, order_index, title")
    .eq("id", id)
    .maybeSingle();
  if (!phase) notFound();

  const { data, error } = await supabase
    .from("modules")
    .select(
      "id, order_index, slug, title, subtitle, is_free_preview, sections:module_sections(body_md, mux_playback_id)",
    )
    .eq("phase_id", id)
    .order("order_index", { ascending: true })
    .returns<ModuleRow[]>();
  if (error) {
    throw new Error(t("phaseModules.loadError", { message: error.message }));
  }
  const modules = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/fases"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          {t("phaseModules.backToPhases")}
        </Link>

        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("phaseModules.eyebrow", {
                index: String(phase.order_index).padStart(2, "0"),
                phaseTitle: phase.title,
              })}
            </p>
            <h1 className="font-serif text-3xl font-semibold">{t("phaseModules.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("phaseModules.description", { count: modules.length })}
            </p>
          </div>
        </header>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>{t("phaseModules.thTitle")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("phaseModules.thSlug")}</TableHead>
                <TableHead className="w-32 text-center">{t("phaseModules.thContent")}</TableHead>
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
                            {t("phaseModules.freePreview")}
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
                              href={`/admin/fases/${id}/modulos/${m.id}/secciones`}
                            />
                          }
                        >
                          <Layers className="size-3.5" />
                          {t("phaseModules.sections")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          render={
                            <Link
                              href={`/admin/fases/${id}/modulos/${m.id}/editar`}
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
