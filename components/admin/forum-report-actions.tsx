"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveReportAction } from "@/lib/forum/admin-actions";

export function ResolveReportButton({ reportId }: { reportId: string }) {
  const t = useTranslations("AdminUI");
  const [pending, startTransition] = useTransition();

  function onClick() {
    const fd = new FormData();
    fd.set("id", reportId);
    startTransition(async () => {
      const res = await resolveReportAction(undefined, fd);
      if (!res.ok) toast.error(res.error);
      else toast.success(t("forumReport.resolved"));
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={onClick}>
      <Check className="size-3.5" />
      {pending ? t("forumReport.resolving") : t("forumReport.resolve")}
    </Button>
  );
}
