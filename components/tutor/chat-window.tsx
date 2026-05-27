"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/module/markdown";
import { EsdrasAvatar } from "@/components/tutor/esdras-avatar";

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
  embedded = false,
}: {
  conversationId: string;
  conversationTitle: string | null;
  initialMessages: DbMessage[];
  /**
   * Cuando true, el componente se renderiza sin propio header ni
   * background full-screen — para vivir dentro de un sheet/drawer
   * (ej. el bubble flotante de Esdras). El bg lo provee el wrapper.
   */
  embedded?: boolean;
}) {
  const t = useTranslations("Tutor");
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, status]);

  const isStreaming = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput("");
  }

  function onSuggested(text: string) {
    if (isStreaming) return;
    sendMessage({ text });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div
      className={
        embedded
          ? "relative flex h-full flex-col text-text-primary"
          : "relative flex min-h-screen flex-col bg-[#04081A] text-text-primary"
      }
    >
      {!embedded && (
        <>
          {/* Cinematic background — sutiles glows DAP (solo full-screen) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(50%_40%_at_50%_0%,rgba(123,97,255,0.12),transparent_60%),radial-gradient(40%_30%_at_50%_100%,rgba(255,77,109,0.08),transparent_60%)]"
          />

          {/* Header con identidad Esdras */}
          <header className="relative z-10 flex items-center gap-3 border-b border-white/[0.06] bg-[#04081A]/80 px-6 py-3 backdrop-blur-xl">
            <EsdrasAvatar size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-grotesk text-sm font-semibold text-text-primary">
                  Esdras
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-inter text-[10px] font-medium text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {t("chat.online")}
                </span>
              </div>
              <p className="truncate font-inter text-[11px] text-text-tertiary">
                {conversationTitle ?? t("chat.defaultSubtitle")}
              </p>
            </div>
          </header>
        </>
      )}

      {/* Scrollable conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {isEmpty ? (
            <EmptyState onSuggested={onSuggested} />
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageRow
                  key={m.id}
                  message={m as unknown as TutorUIMessage}
                />
              ))}

              {isStreaming &&
                !messages.some(
                  (m) =>
                    m.role === "assistant" &&
                    hasTextInParts(m as unknown as TutorUIMessage),
                ) && <TypingRow />}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 z-10 border-t border-white/[0.06] bg-[#04081A]/95 px-4 py-4 backdrop-blur-xl sm:px-6"
      >
        <div className="mx-auto max-w-3xl">
          <div className="group flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 transition-colors focus-within:border-brand-violet/40 focus-within:bg-white/[0.05]">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("chat.placeholder")}
              rows={2}
              className="flex-1 resize-none border-0 bg-transparent px-3 py-2 font-inter text-sm text-text-primary placeholder:text-text-tertiary shadow-none focus-visible:ring-0"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="size-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-violet to-brand-coral text-white shadow-lg shadow-brand-coral/20 hover:opacity-95 disabled:opacity-30 disabled:shadow-none"
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" strokeWidth={2.5} />
              )}
            </Button>
          </div>
          <p className="mt-2 px-1 font-inter text-[11px] text-text-tertiary">
            {t("chat.disclaimer")}
          </p>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// EMPTY STATE — welcome con avatar grande
// ============================================================

function EmptyState({ onSuggested }: { onSuggested: (text: string) => void }) {
  const t = useTranslations("Tutor");
  const suggestedPrompts = [
    t("chat.suggested1"),
    t("chat.suggested2"),
    t("chat.suggested3"),
  ];
  return (
    <div className="flex flex-col items-center pt-12 text-center sm:pt-20">
      <EsdrasAvatar size="xl" showGlow />

      <p className="mt-8 font-inter text-[10px] font-semibold uppercase tracking-[0.42em] text-brand-coral">
        {t("chat.tagline")}
      </p>
      <h2 className="mt-3 font-grotesk text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
        {t.rich("chat.welcomeHeading", {
          highlight: (chunks) => (
            <span className="bg-gradient-to-r from-brand-violet via-[#A28BFF] to-brand-coral bg-clip-text text-transparent">
              {chunks}
            </span>
          ),
        })}
      </h2>
      <p className="mt-4 max-w-md font-inter text-sm leading-relaxed text-text-secondary">
        {t("chat.welcomeBody")}
      </p>

      <div className="mt-10 w-full max-w-lg">
        <p className="mb-3 font-inter text-[10px] font-semibold uppercase tracking-[0.32em] text-text-tertiary">
          <Sparkles className="mr-1 inline size-3 text-brand-violet" />
          {t("chat.toStart")}
        </p>
        <div className="space-y-2">
          {suggestedPrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggested(p)}
              className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left font-inter text-sm text-text-secondary transition-all hover:border-brand-violet/30 hover:bg-brand-violet/[0.06] hover:text-text-primary"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-gradient-to-br from-brand-violet to-brand-coral opacity-60 transition-opacity group-hover:opacity-100" />
              <span className="flex-1">{p}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TYPING INDICATOR — avatar + 3 dots pulsantes
// ============================================================

function TypingRow() {
  return (
    <div className="flex items-end gap-3">
      <EsdrasAvatar size="sm" />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <span className="size-1.5 animate-pulse rounded-full bg-brand-violet [animation-delay:0ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-brand-violet [animation-delay:200ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-brand-violet [animation-delay:400ms]" />
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function hasTextInParts(m: TutorUIMessage): boolean {
  return m.parts?.some(
    (p) => p.type === "text" && typeof (p as { text?: string }).text === "string",
  );
}

function MessageRow({ message }: { message: TutorUIMessage }) {
  const t = useTranslations("Tutor");
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
  const uniqueSources = Array.from(
    new Map(citations.map((c) => [c.source_id, c.source_title])).entries(),
  );

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-brand-violet to-brand-coral px-4 py-2.5 font-inter text-sm text-white shadow-lg shadow-brand-coral/15">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <EsdrasAvatar size="sm" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="rounded-2xl rounded-bl-md border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <div className="prose prose-sm prose-invert max-w-none font-inter">
            <Markdown>{text}</Markdown>
          </div>
        </div>

        {uniqueSources.length > 0 && (
          <div className="rounded-xl border border-brand-violet/15 bg-brand-violet/[0.04] px-4 py-2.5">
            <p className="mb-2 flex items-center gap-1.5 font-inter text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-violet">
              <FileText className="size-3" strokeWidth={2} />
              {t("chat.citedSources")}
            </p>
            <ul className="space-y-1">
              {uniqueSources.map(([sourceId, title]) => (
                <li
                  key={sourceId}
                  className="flex items-center gap-2 font-inter text-xs text-text-secondary"
                >
                  <span className="size-1 shrink-0 rounded-full bg-brand-violet" />
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
