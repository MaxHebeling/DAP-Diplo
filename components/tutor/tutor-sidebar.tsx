"use client";

import { Link } from "@/i18n/navigation";
import { useTransition } from "react";
import { ArrowLeft, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { EsdrasAvatar } from "@/components/tutor/esdras-avatar";
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
  const t = useTranslations("Tutor");
  return (
    <aside className="hidden border-r border-white/[0.06] bg-[#04081A]/95 backdrop-blur-xl lg:flex lg:w-72 lg:flex-col">
      {/* Brand header con Esdras */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <EsdrasAvatar size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-grotesk text-sm font-semibold text-text-primary">
            Esdras
          </p>
          <p className="font-inter text-[10px] uppercase tracking-[0.32em] text-brand-coral">
            {t("sidebar.subtitle")}
          </p>
        </div>
      </div>

      {/* Nueva conversación */}
      <div className="border-b border-white/[0.06] p-3">
        <form action={newConversationRedirectAction}>
          <Button
            type="submit"
            size="sm"
            className="w-full bg-gradient-to-br from-brand-violet to-brand-coral text-white shadow-md shadow-brand-coral/15 hover:opacity-95"
          >
            <Plus className="size-3.5" />
            {t("sidebar.newConversation")}
          </Button>
        </form>
      </div>

      {/* Lista de conversaciones */}
      <nav className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-center font-inter text-xs text-text-tertiary">
            {t("sidebar.noConversations")}
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

      {/* Rate limit + back to dashboard */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center justify-between font-inter text-xs">
          <span className="text-text-tertiary">{t("sidebar.messagesToday")}</span>
          <span
            className={cn(
              "font-medium tabular-nums",
              messagesToday >= 25
                ? "text-red-400"
                : messagesToday >= 20
                  ? "text-amber-400"
                  : "text-text-primary",
            )}
          >
            {t("sidebar.messagesCount", { count: messagesToday })}
          </span>
        </div>
        {/* Progress bar visual */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              "h-full transition-all duration-500",
              messagesToday >= 25
                ? "bg-red-400"
                : messagesToday >= 20
                  ? "bg-amber-400"
                  : "bg-gradient-to-r from-brand-violet to-brand-coral",
            )}
            style={{
              width: `${Math.min(100, (messagesToday / 30) * 100)}%`,
            }}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full justify-start font-inter text-xs text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary"
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="size-3.5" />
          {t("sidebar.goToDashboard")}
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
  const t = useTranslations("Tutor");
  const [pending, startTransition] = useTransition();

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("sidebar.deleteConfirm"))) return;
    const fd = new FormData();
    fd.set("id", conversation.id);
    startTransition(async () => {
      const res = await deleteConversationAction(undefined, fd);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(t("sidebar.deletedToast"));
        if (active) window.location.href = "/tutor";
      }
    });
  }

  return (
    <li>
      <Link
        href={`/tutor/${conversation.id}`}
        className={cn(
          "group flex items-center gap-2 rounded-lg px-3 py-2 font-inter text-sm transition-colors",
          active
            ? "bg-gradient-to-r from-brand-violet/15 to-brand-coral/10 text-text-primary"
            : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
        )}
        aria-current={active ? "page" : undefined}
      >
        <MessageSquare className="size-3.5 shrink-0" strokeWidth={1.7} />
        <span className="flex-1 truncate">
          {conversation.title ?? t("sidebar.untitledConversation")}
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded p-0.5 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
          aria-label={t("sidebar.deleteLabel")}
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
