import {
  FileText,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentUpload } from "@/components/admin/document-upload";
import { DeleteDocumentSourceButton } from "@/components/admin/delete-document-source-button";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/forum/format";

export async function generateMetadata() {
  const t = await getTranslations("Admin");
  return { title: t("tutorDocs.metaTitle") };
}

type SourceRow = {
  id: string;
  title: string;
  kind: "pdf" | "audio_transcript" | "manual";
  chunks_count: number;
  tokens_count: number | null;
  storage_path: string | null;
  created_at: string;
};

export default async function AdminTutorDocumentosPage() {
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_document_sources")
    .select(
      "id, title, kind, chunks_count, tokens_count, storage_path, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<SourceRow[]>();
  if (error) {
    throw new Error(`No se pudieron cargar documentos: ${error.message}`);
  }
  const sources = data ?? [];

  const totalChunks = sources.reduce((sum, s) => sum + s.chunks_count, 0);
  const totalTokens = sources.reduce(
    (sum, s) => sum + (s.tokens_count ?? 0),
    0,
  );

  return (
    <main className="px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-coral">
            {t("tutorDocs.eyebrow")}
          </p>
          <h1 className="font-grotesk text-3xl font-semibold">
            {t("tutorDocs.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("tutorDocs.description")}
          </p>
        </header>

        {/* Métricas */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label={t("tutorDocs.metricDocuments")}
            value={String(sources.length)}
            icon={<FileText className="size-4" />}
          />
          <Metric
            label={t("tutorDocs.metricTotalChunks")}
            value={totalChunks.toLocaleString()}
            icon={<Hash className="size-4" />}
          />
          <Metric
            label={t("tutorDocs.metricEmbeddedTokens")}
            value={totalTokens.toLocaleString()}
            icon={<Hash className="size-4" />}
            hint={`≈ $${((totalTokens / 1_000_000) * 0.18).toFixed(3)}`}
          />
        </div>

        {/* Upload */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("tutorDocs.uploadHeading")}
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            {t("tutorDocs.uploadHint")}
          </p>
          <DocumentUpload />
        </section>

        {/* Tabla */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("tutorDocs.tableHeading")}
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tutorDocs.colTitle")}</TableHead>
                  <TableHead className="hidden sm:table-cell w-24 text-center">
                    {t("tutorDocs.colType")}
                  </TableHead>
                  <TableHead className="w-20 text-center">
                    {t("tutorDocs.colChunks")}
                  </TableHead>
                  <TableHead className="hidden md:table-cell w-24 text-center">
                    {t("tutorDocs.colTokens")}
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-32">
                    {t("tutorDocs.colUploaded")}
                  </TableHead>
                  <TableHead className="w-24 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-12"
                    >
                      <FileText className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                      {t("tutorDocs.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <p className="truncate max-w-[420px]">{s.title}</p>
                        {s.storage_path && (
                          <p className="text-xs text-muted-foreground truncate max-w-[420px]">
                            {s.storage_path}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        <Badge variant="secondary" className="font-normal">
                          {s.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {s.chunks_count}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center tabular-nums text-xs text-muted-foreground">
                        {s.tokens_count?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {timeAgo(s.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteDocumentSourceButton
                          id={s.id}
                          title={s.title}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="font-grotesk text-3xl font-semibold leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
