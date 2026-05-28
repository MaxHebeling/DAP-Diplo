"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { upsertAdminSettingAction } from "@/lib/admin/settings/actions";

export function VoiceManualForm({
  initial,
  lastEditedAt,
}: {
  initial: string;
  lastEditedAt: string | null;
}) {
  const t = useTranslations("VoiceManualForm");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initial);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim().length < 50) {
      toast.error(t("minCharsError"));
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("key", "excorrector_voice_manual");
      fd.set("value", value);
      const res = await upsertAdminSettingAction(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("updated"));
      router.refresh();
    });
  }

  const charCount = value.length;
  const tokenEstimate = Math.round(charCount / 4); // aprox 1 token = 4 chars

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/[0.06] bg-surface-elevated/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {t("charsAndTokens", {
            chars: charCount.toLocaleString(),
            tokens: tokenEstimate.toLocaleString(),
          })}
        </span>
        {lastEditedAt && (
          <span>
            {t("lastEdited", {
              date: new Date(lastEditedAt).toLocaleString("es-MX", {
                dateStyle: "short",
                timeStyle: "short",
              }),
            })}
          </span>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={28}
        className="w-full resize-y rounded-md border border-white/[0.08] bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-foreground outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violet/20"
        placeholder={t("placeholder")}
        spellCheck={false}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="size-4" />
              {t("save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
