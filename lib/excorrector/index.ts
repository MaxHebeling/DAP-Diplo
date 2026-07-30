import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AttachmentPayload } from "./attachment-loader";
import {
  EXCORRECTOR_MODEL,
  EXCORRECTOR_VOICE_MANUAL,
  buildExcorrectorPrompt,
  type ExcorrectorOutput,
} from "./voice-manual";

/**
 * Lee el voice manual de DB (admin_settings.excorrector_voice_manual).
 * Si no hay row en DB, cae al hardcoded EXCORRECTOR_VOICE_MANUAL.
 * Cacheable a nivel runtime (sin TTL) — admin invalida con redeploy o
 * con UPDATE manual a la row.
 */
async function loadVoiceManual(): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.rpc("get_admin_setting", {
      p_key: "excorrector_voice_manual",
    });
    if (typeof data === "string" && data.trim().length > 50) {
      return data;
    }
  } catch {
    // ignored — fallback al hardcoded
  }
  return EXCORRECTOR_VOICE_MANUAL;
}

export type CorrectionResult =
  | { ok: true; data: ExcorrectorOutput; rawResponse: string }
  | { ok: false; error: string; rawResponse?: string };

type CorrectInput = {
  moduleTitle: string;
  moduleObjective: string | null;
  mainRevelation: string | null;
  activationBodyMd: string | null;
  studentText: string;
  studentAttachmentNote?: string;
  /**
   * Si vino con archivo: PDF/imagen llegan como parts multimodales,
   * Word/.txt/.rtf como texto extraído. El builder del prompt y el
   * `messages` payload se ajustan según el `kind`.
   */
  attachment?: AttachmentPayload;
};

/**
 * Corre el agente excorrector contra una entrega de tarea.
 *
 * Política de error: NO throw. Devuelve `ok: false` con el motivo.
 * El caller (cron handler) decide reintentos.
 *
 * Modelo: claude-sonnet-4-6 (mismo que el tutor).
 * Temperatura: 0.4 — algo de calidez en el tono pero score consistente.
 */
export async function correctAssignment(
  input: CorrectInput,
): Promise<CorrectionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY no configurada" };
  }

  // Validación mínima del texto del alumno — si vino vacío Y NO hay
  // attachment con contenido leíble, devolvemos un feedback "entrega vacía"
  // sin gastar tokens. Si hay archivo (PDF/imagen/Word con texto), corregimos.
  const trimmed = input.studentText.trim();
  const hasUsableAttachment =
    input.attachment?.kind === "binary" ||
    (input.attachment?.kind === "text" && input.attachment.extractedText.length > 20);
  if (trimmed.length < 20 && !hasUsableAttachment) {
    return {
      ok: true,
      data: {
        feedback_markdown: `### 1. Lo que vi
Recibí tu entrega pero el texto que escribiste es muy breve para devolverte una corrección sustantiva (menos de 20 caracteres).

### 2. Lo que necesitas afinar
Vuelve a la consigna del módulo y dedícale unos minutos a desarrollar tu respuesta. No hace falta que sea larga, pero sí que tenga sustancia.

### 3. Tu próximo paso
Vuelve a mirar el video de la enseñanza y responde en tus palabras: ¿qué fue lo que más te marcó? Esa es la base para una buena activación.

### 4. Palabra de impartición
Hijo, el llamado se desarrolla en el detalle. No subestimes el peso de una entrega seria, aunque sea de pocas líneas.`,
        score: 0,
        passed: false,
      },
      rawResponse: "",
    };
  }

  const prompt = buildExcorrectorPrompt(input);
  const voiceManual = await loadVoiceManual();

  try {
    // Si hay PDF/imagen adjunto, usamos Anthropic API DIRECTAMENTE (bypass
    // AI SDK): el SDK envía el binario con formato incorrecto y Claude
    // reporta "no puedo leerlo". La API directa con type=document /
    // type=image + source.base64 funciona sin problema.
    let text: string;
    console.log("[excorrector] attachment.kind:", input.attachment?.kind, "· mediaType:", input.attachment?.kind === "binary" ? input.attachment.mediaType : "n/a");
    if (input.attachment?.kind === "binary") {
      console.log("[excorrector] → Anthropic API direct (media)");
      text = await callAnthropicWithMedia(voiceManual, prompt, input.attachment);
      console.log("[excorrector] ← got", text.length, "chars from Anthropic");
    } else {
      const result = await generateText({
        model: anthropic(EXCORRECTOR_MODEL),
        system: voiceManual,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        temperature: 0.4,
      });
      text = result.text;
    }

    const parsed = tryParseJson(text);
    if (!parsed) {
      return {
        ok: false,
        error: "La respuesta del LLM no es JSON válido",
        rawResponse: text,
      };
    }

    if (
      typeof parsed.feedback_markdown !== "string" ||
      typeof parsed.score !== "number" ||
      typeof parsed.passed !== "boolean"
    ) {
      return {
        ok: false,
        error: "Respuesta JSON sin shape esperada",
        rawResponse: text,
      };
    }

    // Clamp del score a [0, 100] por las dudas
    const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    // Re-derivamos passed para consistencia (si el LLM contradijo su propio score)
    const passed = score >= 70;

    return {
      ok: true,
      data: {
        feedback_markdown: parsed.feedback_markdown,
        score,
        passed,
        notes_for_admin:
          typeof parsed.notes_for_admin === "string"
            ? parsed.notes_for_admin
            : undefined,
      },
      rawResponse: text,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `LLM error: ${msg}` };
  }
}

/**
 * Llama a la API de Anthropic directamente pasando PDF/imagen como
 * type=document / type=image con source.base64. Este flujo evita el bug
 * del AI SDK Vercel que envía el binario con formato incorrecto.
 */
async function callAnthropicWithMedia(
  system: string,
  prompt: string,
  attachment: Extract<AttachmentPayload, { kind: "binary" }>,
): Promise<string> {
  const base64 = Buffer.from(attachment.data).toString("base64");
  const isPdf = attachment.mediaType === "application/pdf";
  const mediaBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: attachment.mediaType, data: base64 } };

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: EXCORRECTOR_MODEL,
      max_tokens: 4000,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: [mediaBlock, { type: "text", text: prompt }] }],
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Anthropic API ${r.status}: ${body.slice(0, 300)}`);
  }
  const data = (await r.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  return text;
}

/**
 * Extrae el primer bloque JSON del texto. Tolera que Claude ponga
 * ```json ... ``` o solo el objeto pelado.
 *
 * Si el JSON.parse falla (típico cuando el feedback markdown contiene
 * comillas/backticks no escapados), cae a fallback: extrae cada campo
 * con regex independientes. Robust pero menos preciso.
 */
function tryParseJson(text: string): Record<string, unknown> | null {
  const result = tryStrictJson(text) ?? tryRegexFallback(text);
  return result;
}

function tryStrictJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  // Buscar el primer { y el último } para tolerar contenido alrededor
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  const jsonStr = candidate.slice(first, last + 1);
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fallback: extrae score/passed/feedback con regex cuando el JSON
 * parse falla por comillas mal escapadas en el feedback markdown.
 * Menos preciso pero salva la submission para que el admin la edite.
 */
function tryRegexFallback(text: string): Record<string, unknown> | null {
  // feedback_markdown: capture between "feedback_markdown": "..."
  // Tolera comillas escapadas o no escapadas mezcladas.
  const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
  const passedMatch = text.match(/"passed"\s*:\s*(true|false)/);
  // Para feedback intentamos extraer la sección entre la marca de inicio
  // y el siguiente campo conocido o el final del JSON.
  let feedback: string | null = null;
  const fmStart = text.indexOf('"feedback_markdown"');
  if (fmStart >= 0) {
    // Busca la primera comilla del valor (después de :)
    const colonIdx = text.indexOf(':', fmStart);
    const valStart = text.indexOf('"', colonIdx + 1);
    if (valStart > 0) {
      // El feedback termina antes del próximo campo del JSON o }
      const endMarkers = [
        '","score"', '","passed"', '","notes_for_admin"', '"\n}',
      ];
      let valEnd = -1;
      for (const m of endMarkers) {
        const idx = text.indexOf(m, valStart + 1);
        if (idx > 0 && (valEnd < 0 || idx < valEnd)) valEnd = idx;
      }
      if (valEnd < 0) valEnd = text.lastIndexOf('}');
      if (valEnd > valStart) {
        feedback = text.slice(valStart + 1, valEnd)
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim();
      }
    }
  }
  if (!scoreMatch || !passedMatch || !feedback) return null;
  return {
    feedback_markdown: feedback,
    score: parseInt(scoreMatch[1], 10),
    passed: passedMatch[1] === "true",
  };
}
