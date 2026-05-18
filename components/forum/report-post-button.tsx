"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportPostAction } from "@/lib/forum/report-actions";

export function ReportPostButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    if (reason.trim().length < 4) {
      toast.error("Escribe al menos 4 caracteres de motivo.");
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
      toast.success("Reporte enviado. Lo revisaremos pronto.");
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
        title="Reportar este post"
      >
        <Flag className="size-3" />
        Reportar
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-red-600">
        Reportar este post
      </p>
      <Textarea
        autoFocus
        rows={3}
        placeholder="¿Por qué reportas este post? (mín. 4 caracteres)"
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
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={pending || reason.trim().length < 4}
        >
          {pending ? "Enviando…" : "Enviar reporte"}
        </Button>
      </div>
    </div>
  );
}
