import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Pencil, X } from "lucide-react";
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

type PageProps = { params: Promise<{ slug: string; moduleSlug: string }> };

type SectionRow = {
  id: string;
  kind: "intro" | "teaching" | "activation" | "evaluation" | "impartation";
  order_index: number;
  title: string;
  body_md: string | null;
  mux_playback_id: string | null;
};

const KIND_LABEL_KEY: Record<SectionRow["kind"], string> = {
  intro: "moduleSections.kindIntro",
  teaching: "moduleSections.kindTeaching",
  activation: "moduleSections.kindActivation",
  evaluation: "moduleSections.kindEvaluation",
  impartation: "moduleSections.kindImpartation",
};

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("moduleSections.metaTitle") };
}

export default async function AdminModuleSectionsPage({ params }: PageProps) {
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
    .select("id, phase_id, order_index, title")
    .eq("id", mid)
    .maybeSingle();
  if (!mod || mod.phase_id !== id) notFound();

  const { data, error } = await supabase
    .from("module_sections")
    .select("id, kind, order_index, title, body_md, mux_playback_id")
    .eq("module_id", mid)
    .order("order_index", { ascending: true })
    .returns<SectionRow[]>();
  if (error) {
    throw new Error(t("moduleSections.loadError", { message: error.message }));
  }
  const sections = data ?? [];

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/admin/fases/${id}/modulos`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand-coral"
        >
          <ArrowLeft className="size-4" />
          {t("moduleSections.backToModules")}
        </Link>

        <header className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
              {t("moduleSections.eyebrow", {
                phaseIndex: String(phase.order_index).padStart(2, "0"),
                moduleIndex: String(mod.order_index).padStart(2, "0"),
                moduleTitle: mod.title,
              })}
            </p>
            <h1 className="font-serif text-3xl font-semibold">{t("moduleSections.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("moduleSections.description")}
            </p>
          </div>
          <Button
            variant="outline"
            render={<Link href={`/admin/fases/${id}/modulos/${mid}/editar`} />}
          >
            <Pencil className="size-4" />
            {t("moduleSections.editModule")}
          </Button>
        </header>

        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead className="w-40">{t("moduleSections.thType")}</TableHead>
                <TableHead>{t("moduleSections.thTitle")}</TableHead>
                <TableHead className="w-32 text-center">{t("moduleSections.thBody")}</TableHead>
                <TableHead className="w-32 text-center">{t("moduleSections.thVideo")}</TableHead>
                <TableHead className="w-28 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((s) => {
                const hasBody =
                  Boolean(s.body_md) && s.body_md!.trim().length > 0;
                const hasVideo =
                  Boolean(s.mux_playback_id) && s.mux_playback_id!.length > 0;
                const isTeaching = s.kind === "teaching";
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-serif text-brand-coral tabular-nums">
                      {String(s.order_index).padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {t(KIND_LABEL_KEY[s.kind])}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell className="text-center">
                      {hasBody ? (
                        <Check className="mx-auto size-4 text-emerald-500" />
                      ) : (
                        <X className="mx-auto size-4 text-muted-foreground/40" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isTeaching ? (
                        hasVideo ? (
                          <Check className="mx-auto size-4 text-emerald-500" />
                        ) : (
                          <X className="mx-auto size-4 text-muted-foreground/40" />
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link
                            href={`/admin/fases/${id}/modulos/${mid}/secciones/${s.id}/editar`}
                          />
                        }
                      >
                        <Pencil className="size-3.5" />
                        {t("moduleSections.edit")}
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
