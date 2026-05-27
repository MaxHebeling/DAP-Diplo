"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteDocumentSourceAction } from "@/lib/tutor/actions";

export function DeleteDocumentSourceButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const t = useTranslations("AdminUI");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(t("deleteDocument.confirm", { title }))) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await deleteDocumentSourceAction(undefined, fd);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(t("deleteDocument.deleted"));
        router.refresh();
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={onClick}
      className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
    >
      <Trash2 className="size-3.5" />
      {pending ? t("deleteDocument.deleting") : t("deleteDocument.delete")}
    </Button>
  );
}
