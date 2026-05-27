import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import { createAdminClient } from "@/lib/supabase/admin";
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

  // Validación mínima del texto del alumno — si vino vacío, evitamos
  // gastar tokens en LLM y devolvemos un feedback "entrega vacía".
  const trimmed = input.studentText.trim();
  if (trimmed.length < 20) {
    return {
      ok: true,
      data: {
        feedback_markdown: `### 1. Lo que vi
Recibí tu entrega pero el texto que escribiste es muy breve para devolverte una corrección sustantiva (menos de 20 caracteres).

### 2. Lo que necesitas afinar
Vuelve a la consigna del módulo y dedícale unos minutos a desarrollar tu respuesta. No hace falta que sea larga, pero sí que tenga sustancia.

### 3. Tu próximo paso
Vuelve a mirar el video de la enseñanza y responde en tus palabras: ¿qué fue lo que más te marcó? Esa es la base para una buena activación.

### 4. Palabra de impartación
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
    const { text } = await generateText({
      model: anthropic(EXCORRECTOR_MODEL),
      system: voiceManual,
      prompt,
      temperature: 0.4,
    });

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
 * Extrae el primer bloque JSON del texto. Tolera que Claude ponga
 * ```json ... ``` o solo el objeto pelado.
 */
function tryParseJson(text: string): Record<string, unknown> | null {
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
