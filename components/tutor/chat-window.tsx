"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/module/markdown";

type Citation = {
  source_id: string;
  source_title: string;
  chunk_index: number;
  similarity?: number;
};

type DbMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown;
  created_at: string;
};

// Tipo de UIMessage con el data part custom -citations.
type TutorUIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<
    | { type: "text"; text: string }
    | { type: "data-citations"; data: Citation[] }
    | { type: string; [key: string]: unknown }
  >;
};

function hydrateInitialMessages(rows: DbMessage[]): TutorUIMessage[] {
  return rows.map((r) => {
    const citations = Array.isArray(r.citations)
      ? (r.citations as Citation[])
      : null;
    const parts: TutorUIMessage["parts"] = [];
    if (r.role === "assistant" && citations && citations.length > 0) {
      parts.push({ type: "data-citations", data: citations });
    }
    parts.push({ type: "text", text: r.content });
    return { id: r.id, role: r.role, parts };
  });
}

export function ChatWindow({
  conversationId,
  conversationTitle,
  initialMessages,
}: {
  conversationId: string;
  conversationTitle: string | null;
  initialMessages: DbMessage[];
}) {
  const [input, setInput] = useState("");
  const initial = hydrateInitialMessages(initialMessages);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: "/api/tutor/chat",
      body: () => ({ conversationId }),
    }),
    messages: initial as unknown as Parameters<
      typeof useChat
    >[0] extends infer T
      ? T extends { messages?: infer M }
        ? M
        : never
      : never,
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Auto-scroll al final cuando se añade un mensaje o llega texto streaming.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, status]);

  const isStreaming = status === "submitted" || status === "streaming";

  function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="truncate font-medium">
          {conversationTitle ?? "Nueva conversación"}
        </h1>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8"
      >
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/10 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Escribe tu primera pregunta. Te respondo solo con base en los
                materiales del DAP.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageRow key={m.id} message={m as unknown as TutorUIMessage} />
          ))}

          {isStreaming &&
            !messages.some(
              (m) =>
                m.role === "assistant" &&
                hasTextInParts(m as unknown as TutorUIMessage),
            ) && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Pensando…
              </div>
            )}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t bg-background px-6 py-4"
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Pregúntale al tutor… (⌘ + Enter para enviar)"
              rows={2}
              className="flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm focus-visible:ring-0 shadow-none"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            El tutor puede equivocarse. Responde solo con base en documentos
            ingestados.
          </p>
        </div>
      </form>
    </div>
  );
}

function hasTextInParts(m: TutorUIMessage): boolean {
  return m.parts?.some(
    (p) => p.type === "text" && typeof (p as { text?: string }).text === "string",
  );
}

function MessageRow({ message }: { message: TutorUIMessage }) {
  const isUser = message.role === "user";
  const textParts = (message.parts ?? []).filter(
    (p): p is { type: "text"; text: string } =>
      p.type === "text" && typeof (p as { text?: string }).text === "string",
  );
  const text = textParts.map((p) => p.text).join("\n");
  const citationsPart = (message.parts ?? []).find(
    (p): p is { type: "data-citations"; data: Citation[] } =>
      p.type === "data-citations",
  );
  const citations = citationsPart?.data ?? [];
  // Dedup por source_id para no repetir la misma fuente.
  const uniqueSources = Array.from(
    new Map(
      citations.map((c) => [c.source_id, c.source_title]),
    ).entries(),
  );

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-brand-coral/15 px-4 py-2.5 text-sm">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-foreground/10 text-foreground/70">
          T
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="prose prose-sm prose-neutral max-w-none dark:prose-invert">
          <Markdown>{text}</Markdown>
        </div>
        {uniqueSources.length > 0 && (
          <div className="mt-4 rounded-lg border bg-muted/10 px-3 py-2.5">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Fuentes citadas
            </p>
            <ul className="space-y-1">
              {uniqueSources.map(([sourceId, title]) => (
                <li
                  key={sourceId}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <FileText className="size-3" />
                  <span>{title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
