"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = {
  ok: boolean;
  userId?: string;
  total?: number;
  sent?: number;
  failed?: number;
  expiredCleaned?: number;
  error?: string;
};

export function PushTestForm() {
  const t = useTranslations("PushTestForm");
  const [email, setEmail] = useState("embajadormax@amppbr.org");
  const [title, setTitle] = useState(() => t("defaultTitle"));
  const [body, setBody] = useState(() => t("defaultBody"));
  const [url, setUrl] = useState("/dashboard");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setResult(null);
      try {
        const res = await fetch("/api/admin/push-test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, title, body, url }),
        });
        const data = (await res.json()) as Result;
        setResult(data);
        if (!res.ok) {
          toast.error(data.error ?? `HTTP ${res.status}`);
          return;
        }
        if ((data.sent ?? 0) > 0) {
          toast.success(t("pushSent", { count: data.sent ?? 0 }));
        } else if ((data.total ?? 0) === 0) {
          toast.warning(t("noSubscriptions"));
        } else {
          toast.warning(
            t("someFailed", {
              failed: data.failed ?? 0,
              expired: data.expiredCleaned ?? 0,
            }),
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-white/[0.06] bg-surface-elevated/60 p-5 sm:p-6"
    >
      <div>
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="title">{t("titleLabel")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="body">{t("bodyLabel")}</Label>
        <Input
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={300}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="url">{t("urlLabel")}</Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={500}
          required
          placeholder="/dashboard"
          className="mt-1"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Send className="size-4" />
          {pending ? t("sending") : t("send")}
        </Button>
      </div>

      {result && (
        <pre className="overflow-auto rounded-md bg-black/40 p-3 font-mono text-xs text-text-secondary">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </form>
  );
}
