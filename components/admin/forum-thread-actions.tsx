"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  EyeOff,
  Eye,
  Lock,
  LockOpen,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  toggleThreadClosedAction,
  toggleThreadHiddenAction,
  toggleThreadPinnedAction,
} from "@/lib/forum/admin-actions";

type Props = {
  threadId: string;
  pinned: boolean;
  closed: boolean;
  hidden: boolean;
};

export function ForumThreadActions({ threadId, pinned, closed, hidden }: Props) {
  const t = useTranslations("AdminUI");
  const [pendingPin, startPin] = useTransition();
  const [pendingClose, startClose] = useTransition();
  const [pendingHide, startHide] = useTransition();

  function run(
    label: string,
    action: (
      _prev: { ok: true } | { ok: false; error: string } | undefined,
      fd: FormData,
    ) => Promise<{ ok: true } | { ok: false; error: string }>,
    starter: typeof startPin,
  ) {
    const fd = new FormData();
    fd.set("id", threadId);
    starter(async () => {
      const res = await action(undefined, fd);
      if (!res.ok) toast.error(res.error);
      else toast.success(label);
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        size="sm"
        variant={pinned ? "default" : "outline"}
        disabled={pendingPin}
        onClick={() =>
          run(
            pinned ? t("forumThread.unpinned") : t("forumThread.pinnedTop"),
            toggleThreadPinnedAction,
            startPin,
          )
        }
        title={pinned ? t("forumThread.unpinTitle") : t("forumThread.pinTitle")}
      >
        {pinned ? (
          <PinOff className="size-3.5" />
        ) : (
          <Pin className="size-3.5" />
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pendingClose}
        onClick={() =>
          run(
            closed ? t("forumThread.threadReopened") : t("forumThread.threadClosed"),
            toggleThreadClosedAction,
            startClose,
          )
        }
        title={closed ? t("forumThread.reopenTitle") : t("forumThread.closeTitle")}
      >
        {closed ? (
          <LockOpen className="size-3.5" />
        ) : (
          <Lock className="size-3.5" />
        )}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pendingHide}
        onClick={() =>
          run(
            hidden ? t("forumThread.threadRestored") : t("forumThread.threadHidden"),
            toggleThreadHiddenAction,
            startHide,
          )
        }
        title={hidden ? t("forumThread.restoreTitle") : t("forumThread.hideTitle")}
        className={
          hidden
            ? ""
            : "text-red-500 hover:bg-red-500/10 hover:text-red-600"
        }
      >
        {hidden ? (
          <Eye className="size-3.5" />
        ) : (
          <EyeOff className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
