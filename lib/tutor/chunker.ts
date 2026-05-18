/**
 * Chunker simple para RAG.
 *
 * Estrategia:
 * 1. Limpia espacios/saltos múltiples.
 * 2. Divide por párrafos (doble newline en el original).
 * 3. Agrupa párrafos hasta llegar al budget de caracteres (~500 tokens
 *    × 4 chars/token ≈ 2000 chars).
 * 4. Si un párrafo solo excede el budget, lo parte por oraciones.
 * 5. Cada chunk arranca con un overlap ~200 chars del anterior para
 *    que el contexto pegue entre fronteras.
 *
 * No usa tokenizers reales (tiktoken / sentencepiece) para evitar
 * dependencias pesadas en serverless. La aproximación 4 chars ≈ 1 token
 * es válida para español/inglés y nos da chunks dentro del límite de
 * Voyage (32k tokens / chunk técnicamente, pero queremos retrieval
 * granular).
 */

const TARGET_CHARS = 2000; // ~500 tokens
const OVERLAP_CHARS = 200; // ~50 tokens
const MAX_CHARS = 3000; // hard cap por chunk

export type Chunk = {
  text: string;
  index: number;
};

export function chunkText(raw: string): Chunk[] {
  const cleaned = normalize(raw);
  if (cleaned.length === 0) return [];

  // Si el documento entero cabe en un chunk, no fragmentamos.
  if (cleaned.length <= TARGET_CHARS) {
    return [{ text: cleaned, index: 0 }];
  }

  const paragraphs = cleaned.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  function flush() {
    const trimmed = current.trim();
    if (trimmed.length > 0) chunks.push(trimmed);
    current = "";
  }

  for (const para of paragraphs) {
    if (para.length > MAX_CHARS) {
      // Párrafo muy largo: vacía buffer y trocea por oraciones.
      flush();
      for (const sent of splitSentences(para)) {
        if (current.length + sent.length + 1 > TARGET_CHARS && current.length > 0) {
          flush();
        }
        current += (current ? " " : "") + sent;
        if (current.length >= TARGET_CHARS) flush();
      }
      flush();
      continue;
    }
    if (current.length + para.length + 2 > TARGET_CHARS && current.length > 0) {
      flush();
    }
    current += (current ? "\n\n" : "") + para;
  }
  flush();

  // Aplica overlap: cada chunk (excepto el primero) arranca con los
  // últimos OVERLAP_CHARS del anterior.
  const withOverlap: Chunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let text = chunks[i];
    if (i > 0) {
      const prev = chunks[i - 1];
      const tail = prev.slice(Math.max(0, prev.length - OVERLAP_CHARS));
      text = `${tail}\n\n${text}`;
      if (text.length > MAX_CHARS) {
        text = text.slice(0, MAX_CHARS);
      }
    }
    withOverlap.push({ text, index: i });
  }
  return withOverlap;
}

function normalize(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(p: string): string[] {
  // Aproximación naive: corta en .!? seguido de espacio o fin.
  return p
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/g)
    .map((s) => s.trim())
    .filter(Boolean);
}
