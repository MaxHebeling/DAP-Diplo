"use client";

import { useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Audience = "active" | "pending" | "all";

type Result = {
  ok: boolean;
  totalUsers?: number;
  sent?: number;
  failed?: number;
  error?: string;
};

export function BroadcastForm({
  activeUsers,
  pendingUsers,
}: {
  activeUsers: number;
  pendingUsers: number;
}) {
  const [audience, setAudience] = useState<Audience>("active");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/dashboard");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  const audienceCount =
    audience === "active"
      ? activeUsers
      : audience === "pending"
        ? pendingUsers
        : activeUsers + pendingUsers;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Título y cuerpo son obligatorios");
      return;
    }
    if (
      !confirm(
        `Enviar a ${audienceCount} usuarios? Esta acción es irreversible.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      setResult(null);
      try {
        const res = await fetch("/api/admin/push-broadcast", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ audience, title, body, url }),
        });
        const data = (await res.json()) as Result;
        setResult(data);
        if (!res.ok || !data.ok) {
          toast.error(data.error ?? `HTTP ${res.status}`);
          return;
        }
        toast.success(`Enviado a ${data.sent ?? 0} dispositivos`);
        setTitle("");
        setBody("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-white/[0.06] bg-card/40 p-6"
    >
      <div>
        <Label className="mb-2 block">Audiencia</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { id: "active", label: "Solo activos", count: activeUsers },
              {
                id: "pending",
                label: "Pendientes/pausados",
                count: pendingUsers,
              },
              {
                id: "all",
                label: "Todos",
                count: activeUsers + pendingUsers,
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAudience(opt.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                audience === opt.id
                  ? "border-brand-violet/60 bg-brand-violet/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <p className="font-grotesk text-sm font-semibold">{opt.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {opt.count} usuarios
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={60}
          placeholder="Bienvenida MasterClass de mañana"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">{title.length}/60</p>
      </div>

      <div>
        <Label htmlFor="body">Mensaje</Label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={200}
          rows={3}
          placeholder="Te esperamos mañana 19hs ART en el portal..."
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-inter text-sm focus:border-brand-violet/40 focus:outline-none focus:ring-2 focus:ring-brand-violet/15"
        />
        <p className="mt-1 text-xs text-muted-foreground">{body.length}/200</p>
      </div>

      <div>
        <Label htmlFor="url">URL al hacer click (opcional)</Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/dashboard o /en-vivo"
          className="mt-1"
        />
      </div>

      <Button
        type="submit"
        disabled={pending || audienceCount === 0}
        size="lg"
        className="w-full bg-brand-coral hover:bg-brand-coral/90"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" /> Enviar a {audienceCount} usuarios
          </>
        )}
      </Button>

      {result?.ok && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm">
          <p className="font-medium text-emerald-400">Broadcast OK</p>
          <p className="mt-1 text-muted-foreground">
            {result.totalUsers} usuarios objetivo · {result.sent} dispositivos enviados ·{" "}
            {result.failed} fallidos
          </p>
        </div>
      )}
    </form>
  );
}
