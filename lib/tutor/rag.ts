import { createAdminClient } from "@/lib/supabase/admin";
import { voyageEmbed, VOYAGE_EMBEDDING_DIM } from "@/lib/tutor/voyage";

export type RetrievedChunk = {
  id: string;
  source_id: string;
  source_title: string;
  chunk_index: number;
  chunk_text: string;
  similarity: number;
};

/**
 * Búsqueda RAG: embebe la query del usuario y devuelve los top N chunks
 * más similares por cosine.
 *
 * Usa admin client → bypassa RLS (ai_documents es admin-only). Esto es OK
 * porque el caller (endpoint /api/tutor/chat) ya validó que el usuario
 * tiene suscripción activa.
 */
export async function retrieveChunks(
  query: string,
  opts: { matchCount?: number; threshold?: number } = {},
): Promise<RetrievedChunk[]> {
  // 1) Embed la query (input_type=query, no document)
  const { embeddings } = await voyageEmbed([query], { inputType: "query" });
  if (embeddings.length === 0) return [];
  const embedding = embeddings[0];
  if (embedding.length !== VOYAGE_EMBEDDING_DIM) return [];

  // 2) RPC match_documents (SECURITY DEFINER, definida en migration 0019)
  const admin = createAdminClient();
  // pgvector accepta el array como string formato '[1,2,...]'
  const vectorParam = `[${embedding.join(",")}]`;
  const { data, error } = await admin.rpc("match_documents", {
    query_embedding: vectorParam,
    match_count: opts.matchCount ?? 8,
    similarity_threshold: opts.threshold ?? 0.4,
  });
  if (error) {
    console.error("[retrieveChunks] match_documents failed:", error.message);
    return [];
  }
  return (data ?? []) as RetrievedChunk[];
}

/**
 * Formatea los chunks como bloque de CONTEXTO para inyectar al system
 * prompt de Claude. Cada chunk numerado por fuente para citaciones.
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No hay documentos relevantes en los materiales del DAP para esta consulta.";
  }
  // Agrupa por source_title para que Claude vea fuentes coherentes.
  const grouped = new Map<string, RetrievedChunk[]>();
  for (const c of chunks) {
    const arr = grouped.get(c.source_title) ?? [];
    arr.push(c);
    grouped.set(c.source_title, arr);
  }
  let idx = 1;
  const parts: string[] = [];
  for (const [title, items] of grouped) {
    items.sort((a, b) => a.chunk_index - b.chunk_index);
    const sourceLabel = `[FUENTE ${idx}: ${title}]`;
    const body = items.map((c) => c.chunk_text).join("\n\n---\n\n");
    parts.push(`${sourceLabel}\n${body}`);
    idx++;
  }
  return parts.join("\n\n========\n\n");
}
