/**
 * Descarga el attachment de una submission del bucket `assignment-attachments`
 * y lo prepara para pasarlo a Claude.
 *
 * Estrategia por tipo:
 *  - PDF      → buffer + media_type → Claude lo lee nativo (texto+tablas+imágenes)
 *  - imagen   → buffer + media_type → Claude Vision
 *  - .docx    → mammoth extrae texto plano
 *  - .txt/.rtf → lectura directa como texto
 *  - otros    → no soportado (devuelve `kind: 'unsupported'` para que el
 *               caller mencione el archivo sin intentar leerlo)
 */
import mammoth from "mammoth";
import { createAdminClient } from "@/lib/supabase/admin";

// pdf-parse-fork no tiene types; se importa dinámicamente para evitar
// side effects durante el build (intenta abrir archivos de test en init)
async function extractPdfText(buf: Buffer): Promise<{ text: string; numpages: number }> {
  const mod = (await import("pdf-parse-fork")) as unknown as {
    default: (b: Buffer) => Promise<{ text: string; numpages: number }>;
  };
  return await mod.default(buf);
}

const BUCKET = "assignment-attachments";

export type AttachmentPayload =
  | { kind: "binary"; mediaType: "application/pdf" | "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: Uint8Array; filename: string }
  | { kind: "text"; extractedText: string; filename: string; sourceType: string }
  | { kind: "unsupported"; filename: string; mediaType: string }
  | { kind: "error"; filename: string; error: string };

/**
 * Detecta media type primero por magic bytes del archivo (más robusto —
 * el path/nombre puede estar truncado en storage) y cae a extensión si
 * no reconoce el header.
 */
function detectMediaType(buf: Uint8Array, filename: string): string {
  // Magic bytes
  const b = buf;
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf"; // %PDF-
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png"; // \x89PNG
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"; // JPEG
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif"; // GIF8
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp"; // RIFF...WEBP
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05)) {
    // ZIP (docx/odt son ZIPs)
    const lower = filename.toLowerCase();
    if (lower.endsWith(".docx") || filename.includes(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (lower.endsWith(".odt") || filename.includes(".odt")) return "application/vnd.oasis.opendocument.text";
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; // default docx (más común)
  }

  // Fallback por extensión
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf") || lower.includes(".pdf")) return "application/pdf";
  if (lower.endsWith(".png") || lower.includes(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp") || lower.includes(".webp")) return "image/webp";
  if (lower.endsWith(".docx") || lower.includes(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".rtf")) return "application/rtf";
  if (lower.endsWith(".odt") || lower.includes(".odt")) return "application/vnd.oasis.opendocument.text";
  return "application/octet-stream";
}

export async function loadAttachmentForCorrection(
  attachmentPath: string,
): Promise<AttachmentPayload> {
  const filename = attachmentPath.split("/").pop() ?? attachmentPath;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(attachmentPath);
  if (error || !data) {
    return { kind: "error", filename, error: error?.message ?? "download empty" };
  }
  const buf = new Uint8Array(await data.arrayBuffer());
  const mediaType = detectMediaType(buf, filename);

  // PDFs → extraer texto localmente con pdf-parse-fork y pasarlo como
  // texto al prompt. NO usamos multimodal binary porque el AI SDK Vercel
  // envía mal el formato al backend Anthropic (Claude reporta "no puedo
  // leerlo" aunque el PDF sea válido). Fallback: si extractText devuelve
  // menos de 30 chars (PDF escaneado con imagen), lo pasamos como binary
  // para que Claude Vision intente OCR.
  if (mediaType === "application/pdf") {
    // Devolvemos binary — correctAssignment usa Anthropic API directa
    // (bypass AI SDK) para pasarlo como type=document base64.
    return { kind: "binary", mediaType: "application/pdf", data: buf, filename };
  }

  // Imágenes → directo a Claude Vision
  if (mediaType === "image/png" || mediaType === "image/jpeg" || mediaType === "image/webp" || mediaType === "image/gif") {
    return { kind: "binary", mediaType, data: buf, filename };
  }

  // Word (.docx) → mammoth extrae texto
  if (mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
      return {
        kind: "text",
        extractedText: result.value.trim(),
        filename,
        sourceType: "Word (.docx)",
      };
    } catch (e) {
      return {
        kind: "error",
        filename,
        error: `mammoth: ${(e as Error).message}`,
      };
    }
  }

  // .txt/.rtf → texto plano (rtf llevará algunas marcas, Claude las puede ignorar)
  if (mediaType === "text/plain" || mediaType === "application/rtf") {
    try {
      const text = new TextDecoder().decode(buf);
      return {
        kind: "text",
        extractedText: text.trim(),
        filename,
        sourceType: mediaType === "application/rtf" ? "RTF" : "texto plano",
      };
    } catch (e) {
      return { kind: "error", filename, error: `decode: ${(e as Error).message}` };
    }
  }

  // .doc viejo / .odt / otros → no soportado
  return { kind: "unsupported", filename, mediaType };
}
