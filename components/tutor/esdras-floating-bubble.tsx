"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Loader2, MessageCirclePlus, X } from "lucide-react";

import { ChatWindow } from "@/components/tutor/chat-window";
import { EsdrasAvatar } from "@/components/tutor/esdras-avatar";

type SessionPayload = {
  conversationId: string;
  title: string | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    citations: unknown;
    created_at: string;
  }>;
};

/**
 * Bubble flotante de Esdras — disponible en todas las páginas del
 * portal del alumno excepto /tutor (donde ya tenés la experiencia
 * completa).
 *
 * Click → abre un sheet desde la derecha con el chat embebido.
 * Carga la conversación más reciente o crea una nueva si no hay.
 *
 * El sheet es full-screen en mobile, panel de 440px en desktop.
 */
export function EsdrasFloatingBubble() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  // No mostrar el bubble dentro de la propia experiencia del tutor —
  // ahí ya tenés el chat completo con sidebar.
  const hideBubble = pathname?.startsWith("/tutor") ?? false;

  // Carga la sesión en respuesta al evento de open (no en effect — evita
  // cascading renders flagged por react-hooks/set-state-in-effect).
  const loadSession = useCallback(async () => {
    if (session || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tutor/quick-session", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar la conversación");
      const data = (await res.json()) as SessionPayload;
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  function handleOpen() {
    setOpen(true);
    void loadSession();
  }

  // Lock body scroll cuando el sheet está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function startNewConversation() {
    setCreatingNew(true);
    try {
      const res = await fetch("/api/tutor/quick-session", {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo crear");
      const data = (await res.json()) as SessionPayload;
      setSession(data);
    } catch {
      // silencioso — el chat sigue mostrando lo anterior
    } finally {
      setCreatingNew(false);
    }
  }

  if (hideBubble) return null;

  return (
    <>
      {/* Botón flotante (siempre visible cuando el bubble está habilitado) */}
      <motion.button
        type="button"
        onClick={handleOpen}
        initial={{ opacity: 0, scale: 0.85, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="group fixed bottom-20 right-4 z-40 flex items-center gap-2.5 rounded-full border border-brand-violet/35 bg-[#04081A]/95 py-2 pl-2 pr-4 shadow-[0_10px_40px_-10px_rgba(123,97,255,0.55)] backdrop-blur-xl transition-all hover:border-brand-violet/60 hover:shadow-[0_15px_50px_-12px_rgba(123,97,255,0.75)] lg:bottom-6 lg:right-6"
        aria-label="Abrir chat con Esdras"
      >
        <EsdrasAvatar size="md" showGlow />
        <span className="hidden font-grotesk text-sm font-semibold text-text-primary sm:inline">
          Esdras
        </span>
      </motion.button>

      {/* Sheet del chat */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              aria-hidden
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-[#04081A] shadow-2xl sm:w-[440px]"
              role="dialog"
              aria-label="Chat con Esdras"
            >
              {/* Header del sheet */}
              <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#04081A]/90 px-4 py-3 backdrop-blur-xl">
                <EsdrasAvatar size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-grotesk text-sm font-semibold text-text-primary">
                      Esdras
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-inter text-[9px] font-medium text-emerald-400">
                      <span className="size-1 rounded-full bg-emerald-400" />
                      En línea
                    </span>
                  </div>
                  <p className="truncate font-inter text-[10px] text-text-tertiary">
                    Tutor del Diplomado Apostólico Pastoral
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startNewConversation}
                  disabled={creatingNew || loading}
                  className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-white/[0.05] hover:text-text-primary disabled:opacity-40"
                  aria-label="Nueva conversación"
                  title="Nueva conversación"
                >
                  {creatingNew ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MessageCirclePlus className="size-4" strokeWidth={1.8} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                  aria-label="Cerrar chat"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>

              {/* Body — el chat */}
              <div className="flex-1 overflow-hidden">
                {loading || !session ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-brand-violet" />
                  </div>
                ) : (
                  <ChatWindow
                    key={session.conversationId}
                    conversationId={session.conversationId}
                    conversationTitle={session.title}
                    initialMessages={session.messages}
                    embedded
                  />
                )}
              </div>

              {/* Footer con link al chat completo */}
              {session && (
                <div className="border-t border-white/[0.06] bg-[#04081A]/90 px-4 py-2.5 backdrop-blur-xl">
                  <Link
                    href={`/tutor/${session.conversationId}`}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1.5 font-inter text-[11px] text-text-tertiary transition-colors hover:text-text-primary"
                  >
                    Abrir chat completo
                    <ArrowUpRight className="size-3" strokeWidth={1.8} />
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
