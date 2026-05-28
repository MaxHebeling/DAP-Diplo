"use client";

import { Link } from "@/i18n/navigation";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { closeThreadAction } from "@/lib/forum/actions";

export function ThreadAuthorActions({
  threadId,
  closed,
}: {
  threadId: string;
  closed: boolean;
}) {
  const t = useTranslations("Forum");
  const [pending, startTransition] = useTransition();

  function onClose() {
    if (closed) return;
    if (!confirm(t("authorActions.closeConfirm"))) return;
    const fd = new FormData();
    fd.set("id", threadId);
    startTransition(async () => {
      const res = await closeThreadAction(undefined, fd);
      if (res && !res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        render={<Link href={`/comunidad/${threadId}/editar`} />}
      >
        <Pencil className="size-3.5" />
        {t("authorActions.edit")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onClose}
        disabled={pending || closed}
        className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
      >
        <Trash2 className="size-3.5" />
        {closed
          ? t("authorActions.closed")
          : pending
            ? t("authorActions.closing")
            : t("authorActions.close")}
      </Button>
    </div>
  );
}
