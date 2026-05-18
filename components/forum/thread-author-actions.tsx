"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { closeThreadAction } from "@/lib/forum/actions";

export function ThreadAuthorActions({
  threadId,
  closed,
}: {
  threadId: string;
  closed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClose() {
    if (closed) return;
    if (
      !confirm(
        "¿Cerrar este hilo? Ya no se aceptarán respuestas. La conversación queda visible.",
      )
    )
      return;
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
        Editar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onClose}
        disabled={pending || closed}
        className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
      >
        <Trash2 className="size-3.5" />
        {closed ? "Cerrado" : pending ? "Cerrando…" : "Cerrar"}
      </Button>
    </div>
  );
}
