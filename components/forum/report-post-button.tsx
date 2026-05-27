"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportPostAction } from "@/lib/forum/report-actions";

export function ReportPostButton({ postId }: { postId: string }) {
  const t = useTranslations("Forum");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    if (reason.trim().length < 4) {
      toast.error(t("reportPost.minReason"));
      return;
    }
    const fd = new FormData();
    fd.set("post_id", postId);
    fd.set("reason", reason.trim());
    startTransition(async () => {
      const res = await reportPostAction(undefined, fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("reportPost.success"));
      setReason("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
        title={t("reportPost.triggerTitle")}
      >
        <Flag className="size-3" />
        {t("reportPost.trigger")}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-red-600">
        {t("reportPost.heading")}
      </p>
      <Textarea
        autoFocus
        rows={3}
        placeholder={t("reportPost.reasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="text-sm"
        disabled={pending}
      />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setReason("");
          }}
          disabled={pending}
        >
          {t("reportPost.cancel")}
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={pending || reason.trim().length < 4}
        >
          {pending ? t("reportPost.sending") : t("reportPost.sendReport")}
        </Button>
      </div>
    </div>
  );
}
