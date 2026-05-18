/**
 * Cliente Voyage AI minimalista (HTTP directo, sin SDK).
 *
 * Endpoint: POST https://api.voyageai.com/v1/embeddings
 * Auth: Authorization: Bearer ${VOYAGE_API_KEY}
 * Model default: voyage-3-large (1024-dim output)
 *
 * Batch: hasta 128 textos por request. Aprovechamos para procesar todos
 * los chunks de un PDF en pocas llamadas → 1-3 segundos en lugar de
 * decenas si fuera secuencial.
 */

const VOYAGE_API = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MAX_BATCH = 128;
export const VOYAGE_EMBEDDING_DIM = 1024;
export const VOYAGE_MODEL = "voyage-3-large";

type VoyageBatchResponse = {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
};

export type EmbedResult = {
  embeddings: number[][];
  tokensUsed: number;
};

/**
 * Embebe un batch de textos. Si pasa el máximo del modelo, divide
 * automáticamente en sub-batches y los procesa secuencialmente
 * (Voyage tiene rate-limit por requests/min).
 */
export async function voyageEmbed(
  texts: string[],
  opts?: { inputType?: "document" | "query" },
): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY no configurada. Añádela a .env.local y Vercel.",
    );
  }
  if (texts.length === 0) {
    return { embeddings: [], tokensUsed: 0 };
  }

  const allEmbeddings: number[][] = [];
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += VOYAGE_MAX_BATCH) {
    const slice = texts.slice(i, i + VOYAGE_MAX_BATCH);
    const res = await fetch(VOYAGE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: slice,
        model: VOYAGE_MODEL,
        input_type: opts?.inputType ?? "document",
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Voyage HTTP ${res.status}: ${errText.slice(0, 500)}`);
    }
    const data = (await res.json()) as VoyageBatchResponse;
    // Asegurar orden por index — Voyage normalmente lo devuelve ordenado
    // pero defensive sort.
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      if (item.embedding.length !== VOYAGE_EMBEDDING_DIM) {
        throw new Error(
          `Embedding dim inesperada: ${item.embedding.length} (esperaba ${VOYAGE_EMBEDDING_DIM})`,
        );
      }
      allEmbeddings.push(item.embedding);
    }
    totalTokens += data.usage.total_tokens;
  }

  return { embeddings: allEmbeddings, tokensUsed: totalTokens };
}
