import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/lib/tutor/chunker";
import { voyageEmbed } from "@/lib/tutor/voyage";

const DEFAULT_BUCKET = "ai-documents";

export type IngestResult = {
  source_id: string;
  chunks_count: number;
  tokens_used: number;
  total_chars: number;
};

/**
 * Ingest pipeline para PDFs:
 *   1. Descarga el PDF desde Storage.
 *   2. Extrae texto con pdf-parse.
 *   3. Chunk + embed (batch Voyage).
 *   4. INSERT en ai_documents + INSERT en ai_document_sources.
 */
export async function ingestPdf(opts: {
  storagePath: string;
  sourceTitle: string;
  createdBy: string;
  bucket?: string;
}): Promise<IngestResult> {
  const admin = createAdminClient();
  const bucket = opts.bucket ?? DEFAULT_BUCKET;

  // 1) Descarga
  const { data: blob, error: dlErr } = await admin.storage
    .from(bucket)
    .download(opts.storagePath);
  if (dlErr || !blob) {
    throw new Error(
      `No se pudo descargar PDF (${opts.storagePath}): ${dlErr?.message ?? "desconocido"}`,
    );
  }
  const buffer = Buffer.from(await blob.arrayBuffer());

  // 2) Extracción de texto con unpdf (serverless-friendly, sin DOMMatrix)
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text: pages } = await extractText(pdf, {
    mergePages: false,
  });
  const fullText = Array.isArray(pages) ? pages.join("\n\n") : pages;
  const totalChars = fullText.length;
  if (totalChars < 50) {
    throw new Error(
      `PDF parece vacío o escaneado (${totalChars} chars extraídos).`,
    );
  }
  const pagesCount = totalPages;

  // 3) Chunking
  const chunks = chunkText(fullText);
  if (chunks.length === 0) {
    throw new Error("No se generaron chunks del PDF.");
  }

  // 4) Embeddings (batch). Voyage maneja hasta 128 textos por request.
  const { embeddings, tokensUsed } = await voyageEmbed(
    chunks.map((c) => c.text),
    { inputType: "document" },
  );
  if (embeddings.length !== chunks.length) {
    throw new Error(
      `Mismatch chunks/embeddings: ${chunks.length} vs ${embeddings.length}`,
    );
  }

  // 5) INSERT source primero (para tener source_id)
  const { data: source, error: srcErr } = await admin
    .from("ai_document_sources")
    .insert({
      title: opts.sourceTitle,
      kind: "pdf",
      storage_path: opts.storagePath,
      chunks_count: chunks.length,
      tokens_count: tokensUsed,
      created_by: opts.createdBy,
    })
    .select("id")
    .single();
  if (srcErr || !source) {
    throw new Error(
      `No se pudo crear ai_document_sources: ${srcErr?.message ?? "missing"}`,
    );
  }

  // 6) INSERT chunks en batch
  const rows = chunks.map((c, i) => ({
    source_id: source.id,
    source_title: opts.sourceTitle,
    source_kind: "pdf",
    chunk_text: c.text,
    chunk_index: c.index,
    // pgvector acepta el array como string formateado o como array.
    // El driver supabase-js lo serializa OK como array de números.
    embedding: embeddings[i],
    metadata: { pdf_pages: pagesCount },
  }));

  const { error: insertErr } = await admin.from("ai_documents").insert(rows);
  if (insertErr) {
    // Rollback: borra el source row para no dejar huérfanos
    await admin.from("ai_document_sources").delete().eq("id", source.id);
    throw new Error(
      `No se pudieron insertar chunks: ${insertErr.message}`,
    );
  }

  return {
    source_id: source.id,
    chunks_count: chunks.length,
    tokens_used: tokensUsed,
    total_chars: totalChars,
  };
}
