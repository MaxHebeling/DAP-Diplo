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
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/forum/format";

export const metadata = { title: "Tutor · Documentos — Admin DAP" };

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
            Admin · Tutor IA
          </p>
          <h1 className="font-serif text-3xl font-semibold">
            Documentos (RAG)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube PDFs apostólicos para que el tutor IA tenga contexto. Cada
            documento se trocea (~500 tokens/chunk) y se embebe con Voyage
            voyage-3-large (1024-dim).
          </p>
        </header>

        {/* Métricas */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Documentos"
            value={String(sources.length)}
            icon={<FileText className="size-4" />}
          />
          <Metric
            label="Chunks totales"
            value={totalChunks.toLocaleString()}
            icon={<Hash className="size-4" />}
          />
          <Metric
            label="Tokens embedidos"
            value={totalTokens.toLocaleString()}
            icon={<Hash className="size-4" />}
            hint={`≈ $${((totalTokens / 1_000_000) * 0.18).toFixed(3)}`}
          />
        </div>

        {/* Upload */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Subir nuevo PDF
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Max 20 MB. El ingest puede tardar 10-30 segundos según
            extensión.
          </p>
          <DocumentUpload />
        </section>

        {/* Tabla */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Documentos ingestados
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden sm:table-cell w-24 text-center">
                    Tipo
                  </TableHead>
                  <TableHead className="w-20 text-center">Chunks</TableHead>
                  <TableHead className="hidden md:table-cell w-24 text-center">
                    Tokens
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-32">
                    Subido
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
                      Todavía no hay documentos ingestados.
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
      <p className="font-serif text-3xl font-semibold leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
