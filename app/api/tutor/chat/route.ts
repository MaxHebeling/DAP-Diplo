import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retrieveChunks, formatChunksAsContext } from "@/lib/tutor/rag";
import { buildSystemPrompt } from "@/lib/tutor/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.uuid(),
  messages: z.array(z.unknown()),
});

const TUTOR_MODEL = "claude-sonnet-4-6";

export async function POST(req: Request) {
  // 1) Auth + suscripción activa
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const [{ data: profile }, { data: activeSub }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("has_active_subscription"),
  ]);
  const isAdmin = profile?.role === "admin";
  if (!isAdmin && !activeSub) {
    return Response.json(
      { error: "El tutor IA requiere suscripción activa." },
      { status: 403 },
    );
  }

  // 2) Parse body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }
  const { conversationId, messages } = parsed.data;
  const uiMessages = messages as UIMessage[];

  // 3) Verifica que la conversación es del user (defense-in-depth, RLS también)
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, user_id, title")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id) {
    return Response.json(
      { error: "Conversación no encontrada o sin acceso." },
      { status: 404 },
    );
  }

  // 4) Rate limit (atomic increment, 30/día)
  const { data: allowed, error: rlErr } = await supabase.rpc(
    "check_and_increment_ai_rate",
    { p_user_id: user.id },
  );
  if (rlErr) {
    return Response.json({ error: rlErr.message }, { status: 500 });
  }
  if (allowed === false) {
    return Response.json(
      {
        error:
          "Has alcanzado el límite de 30 mensajes/día con el tutor. Reinicia mañana.",
      },
      { status: 429 },
    );
  }

  // 5) Extrae el último mensaje del usuario
  const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return Response.json(
      { error: "No hay mensaje del usuario" },
      { status: 400 },
    );
  }
  const userQuery = extractText(lastUser);
  if (!userQuery || userQuery.length < 2) {
    return Response.json(
      { error: "Mensaje vacío" },
      { status: 400 },
    );
  }

  // 6) Persiste el user message + RAG retrieval (en paralelo)
  const admin = createAdminClient();
  const [chunks] = await Promise.all([
    retrieveChunks(userQuery, { matchCount: 8, threshold: 0.3 }),
    admin.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userQuery,
    }),
  ]);

  const citations = chunks.map((c) => ({
    source_id: c.source_id,
    source_title: c.source_title,
    chunk_index: c.chunk_index,
    similarity: Number(c.similarity.toFixed(3)),
  }));

  // 7) Si la conversación aún no tiene título, usa los primeros 60 chars
  if (!conv.title) {
    const newTitle = userQuery.slice(0, 60).trim();
    await admin
      .from("ai_conversations")
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } else {
    await admin
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  // 8) Stream con Claude
  const systemPrompt = buildSystemPrompt(formatChunksAsContext(chunks));

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Envía las citaciones como data part ANTES del texto.
      // El cliente lee message.parts y filtra los data-citations.
      writer.write({
        type: "data-citations",
        data: citations,
        transient: false,
      });

      const modelMessages = await convertToModelMessages(uiMessages);
      const result = streamText({
        model: anthropic(TUTOR_MODEL),
        system: systemPrompt,
        messages: modelMessages,
        temperature: 0.3,
        onFinish: async ({ text }) => {
          // 9) Persiste assistant message con citations
          await admin.from("ai_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: text,
            citations,
          });
        },
      });
      writer.merge(result.toUIMessageStream({ sendStart: false }));
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Error en el tutor";
      console.error("[tutor.chat] stream error:", msg);
      return msg;
    },
  });

  return createUIMessageStreamResponse({ stream });
}

// Extrae el texto plano de un UIMessage (las nuevas versiones del SDK
// estructuran content como parts[]).
function extractText(msg: UIMessage): string {
  const parts = (msg as { parts?: { type: string; text?: string }[] }).parts;
  if (Array.isArray(parts)) {
    return parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("\n")
      .trim();
  }
  // Fallback v3: content string directo
  const content = (msg as { content?: unknown }).content;
  if (typeof content === "string") return content.trim();
  return "";
}
