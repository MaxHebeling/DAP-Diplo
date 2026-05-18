"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        `¿Eliminar "${title}"? Se borran sus chunks de la base RAG y el PDF original del storage. No reversible.`,
      )
    )
      return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await deleteDocumentSourceAction(undefined, fd);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Documento eliminado.");
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
      {pending ? "Eliminando…" : "Eliminar"}
    </Button>
  );
}
