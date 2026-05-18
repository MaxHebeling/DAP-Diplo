"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Brain, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import {
  deleteConversationAction,
  newConversationRedirectAction,
} from "@/lib/tutor/conversation-actions";
import { cn } from "@/lib/utils";

type Conv = { id: string; title: string | null; updated_at: string };

export function TutorSidebar({
  conversations,
  activeId,
  messagesToday,
}: {
  conversations: Conv[];
  activeId: string | null;
  messagesToday: number;
}) {
  return (
    <aside className="hidden border-r bg-card/30 lg:flex lg:w-72 lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <Logo size="sm" />
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-brand-coral">
          <Brain className="size-3.5" />
          Tutor
        </span>
      </div>

      <div className="p-3 border-b">
        <form action={newConversationRedirectAction}>
          <Button type="submit" className="w-full" size="sm">
            <Plus className="size-3.5" />
            Nueva conversación
          </Button>
        </form>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Aún no tienes conversaciones.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === activeId}
              />
            ))}
          </ul>
        )}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Mensajes hoy</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              messagesToday >= 25
                ? "text-red-500"
                : messagesToday >= 20
                  ? "text-amber-500"
                  : "text-foreground",
            )}
          >
            {messagesToday} / 30
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start text-muted-foreground hover:text-foreground"
          render={<Link href="/dashboard" />}
        >
          ← Ir a mi dashboard
        </Button>
      </div>
    </aside>
  );
}

function ConversationRow({
  conversation,
  active,
}: {
  conversation: Conv;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Eliminar esta conversación? No reversible.")) return;
    const fd = new FormData();
    fd.set("id", conversation.id);
    startTransition(async () => {
      const res = await deleteConversationAction(undefined, fd);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Conversación eliminada.");
        // Si estoy en la página que borré, vuelvo al index
        if (active) window.location.href = "/tutor";
      }
    });
  }

  return (
    <li>
      <Link
        href={`/tutor/${conversation.id}`}
        className={cn(
          "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-brand-coral/10 text-foreground"
            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        <MessageSquare className="size-3.5 shrink-0" strokeWidth={1.7} />
        <span className="flex-1 truncate">
          {conversation.title ?? "Nueva conversación"}
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-red-500/10 hover:text-red-500"
          aria-label="Eliminar"
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Trash2 className="size-3" />
          )}
        </button>
      </Link>
    </li>
  );
}
